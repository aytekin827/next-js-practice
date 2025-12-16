import { createClient } from '@/utils/supabase/server';

export interface KISConfig {
  appKey: string;
  appSecret: string;
  accountNumber: string;
  accountProductCode: string;
  baseUrl: string;
}

/**
 * 사용자의 KIS 설정을 DB에서 가져옵니다
 */
export async function getKISConfig(userId: string): Promise<KISConfig | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kis_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('KIS 설정을 찾을 수 없습니다:', error);
      return null;
    }

    // 필수 설정값이 모두 있는지 확인
    if (!data.kis_app_key || !data.kis_app_secret || !data.kis_cano) {
      console.error('KIS 설정이 불완전합니다');
      return null;
    }

    return {
      appKey: data.kis_app_key,
      appSecret: data.kis_app_secret,
      accountNumber: data.kis_cano,
      accountProductCode: data.kis_acnt_prdt_cd || '01',
      baseUrl: data.kis_base_url || 'https://openapi.koreainvestment.com:9443'
    };
  } catch (error) {
    console.error('KIS 설정 조회 중 오류:', error);
    return null;
  }
}

/**
 * KIS API 호출을 위한 공통 헤더를 생성합니다
 */
export function createKISHeaders(config: KISConfig, accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'authorization': accessToken ? `Bearer ${accessToken}` : '',
    'appkey': config.appKey,
    'appsecret': config.appSecret,
    'tr_id': '', // API별로 설정 필요
  };

  return headers;
}

/**
 * KIS 액세스 토큰을 발급받습니다
 */
export async function getKISAccessToken(config: KISConfig): Promise<string | null> {
  try {
    const response = await fetch(`${config.baseUrl}/oauth2/tokenP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: config.appKey,
        appsecret: config.appSecret,
      }),
    });

    if (!response.ok) {
      console.error('KIS 토큰 발급 실패:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('KIS 토큰 발급 중 오류:', error);
    return null;
  }
}