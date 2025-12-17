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
 * 저장된 KIS 토큰을 조회합니다 (유효한 토큰만)
 */
export async function getStoredKISToken(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kis_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString()) // 만료되지 않은 토큰만
      .single();

    if (error || !data) {
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('저장된 토큰 조회 중 오류:', error);
    return null;
  }
}

/**
 * KIS 토큰을 DB에 저장합니다
 */
export async function saveKISToken(userId: string, accessToken: string, expiresInSeconds: number = 86400): Promise<void> {
  try {
    const supabase = await createClient();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    const { error } = await supabase
      .from('kis_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('토큰 저장 실패:', error);
    }
  } catch (error) {
    console.error('토큰 저장 중 오류:', error);
  }
}

/**
 * 새로운 KIS 액세스 토큰을 발급받습니다
 */
export async function issueNewKISToken(config: KISConfig): Promise<string | null> {
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

/**
 * 토큰 상태 정보를 조회합니다
 */
export async function getKISTokenStatus(userId: string): Promise<{
  hasToken: boolean;
  expiresAt?: string;
  remainingHours?: number;
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kis_tokens')
      .select('expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { hasToken: false };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));

    return {
      hasToken: remainingMs > 0,
      expiresAt: data.expires_at,
      remainingHours
    };
  } catch (error) {
    console.error('토큰 상태 조회 중 오류:', error);
    return null;
  }
}

/**
 * KIS 액세스 토큰을 가져옵니다 (캐시된 토큰 우선 사용)
 */
export async function getKISAccessToken(config: KISConfig, userId: string): Promise<string | null> {
  try {
    // 1. 먼저 저장된 유효한 토큰이 있는지 확인
    const storedToken = await getStoredKISToken(userId);
    if (storedToken) {
      // console.log('캐시된 KIS 토큰 사용');
      return storedToken;
    }

    // 2. 저장된 토큰이 없거나 만료된 경우 새로 발급
    console.log('새로운 KIS 토큰 발급');
    const newToken = await issueNewKISToken(config);
    if (newToken) {
      // 3. 새로 발급받은 토큰을 저장 (24시간 = 86400초)
      await saveKISToken(userId, newToken, 86400);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('KIS 토큰 획득 중 오류:', error);
    return null;
  }
}

/**
 * 사용자의 토큰을 강제로 삭제합니다 (로그아웃 시 사용)
 */
export async function deleteKISToken(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('kis_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('토큰 삭제 실패:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('토큰 삭제 중 오류:', error);
    return false;
  }
}