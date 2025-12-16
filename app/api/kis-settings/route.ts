import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// KIS 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자별 KIS 설정 조회
    const { data, error } = await supabase
      .from('kis_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터가 없을 때
      console.error('KIS 설정 조회 실패:', error);
      return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 });
    }

    // 데이터가 없으면 기본값 반환
    if (!data) {
      return NextResponse.json({
        KIS_APP_KEY: '',
        KIS_APP_SECRET: '',
        KIS_CANO: '',
        KIS_ACNT_PRDT_CD: '01',
        KIS_BASE_URL: 'https://openapi.koreainvestment.com:9443'
      });
    }

    // 보안상 APP_SECRET은 마스킹해서 반환
    return NextResponse.json({
      KIS_APP_KEY: data.kis_app_key || '',
      KIS_APP_SECRET: data.kis_app_secret ? '••••••••••••••••' : '',
      KIS_CANO: data.kis_cano || '',
      KIS_ACNT_PRDT_CD: data.kis_acnt_prdt_cd || '01',
      KIS_BASE_URL: data.kis_base_url || 'https://openapi.koreainvestment.com:9443'
    });
  } catch (error) {
    console.error('KIS 설정 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// KIS 설정 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { KIS_APP_KEY, KIS_APP_SECRET, KIS_CANO, KIS_ACNT_PRDT_CD, KIS_BASE_URL } = await request.json();

    // 필수 필드 검증
    if (!KIS_APP_KEY || !KIS_CANO) {
      return NextResponse.json({ error: 'APP KEY와 계좌번호는 필수입니다' }, { status: 400 });
    }

    // APP_SECRET이 마스킹된 값이면 업데이트하지 않음
    const updateData: Record<string, string> = {
      user_id: user.id,
      kis_app_key: KIS_APP_KEY,
      kis_cano: KIS_CANO,
      kis_acnt_prdt_cd: KIS_ACNT_PRDT_CD || '01',
      kis_base_url: KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443',
      updated_at: new Date().toISOString()
    };

    // APP_SECRET이 실제 값이면 포함
    if (KIS_APP_SECRET && !KIS_APP_SECRET.includes('••••')) {
      updateData.kis_app_secret = KIS_APP_SECRET;
    }

    // UPSERT (있으면 업데이트, 없으면 생성)
    const { error } = await supabase
      .from('kis_settings')
      .upsert(updateData, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('KIS 설정 저장 실패:', error);
      return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '설정이 저장되었습니다' });
  } catch (error) {
    console.error('KIS 설정 저장 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}