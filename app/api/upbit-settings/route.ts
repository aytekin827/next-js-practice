import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Upbit 설정 조회
    const { data, error } = await supabase
      .from('upbit_settings')
      .select('access_key, secret_key, base_url')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없는 경우 기본값 반환
        return NextResponse.json({
          access_key: '',
          secret_key: '',
          base_url: 'https://api.upbit.com'
        });
      }
      console.error('Upbit 설정 조회 실패:', error);
      return NextResponse.json({ error: '설정 조회에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Upbit 설정 조회 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { access_key, secret_key, base_url } = body;

    // 필수 필드 검증
    if (!access_key || !secret_key) {
      return NextResponse.json({ 
        error: 'Access Key와 Secret Key는 필수입니다' 
      }, { status: 400 });
    }

    // Upbit 설정 저장 (upsert)
    const { error } = await supabase
      .from('upbit_settings')
      .upsert({
        user_id: user.id,
        access_key,
        secret_key,
        base_url: base_url || 'https://api.upbit.com',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Upbit 설정 저장 실패:', error);
      return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Upbit API 설정이 성공적으로 저장되었습니다' 
    });
  } catch (error) {
    console.error('Upbit 설정 저장 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}