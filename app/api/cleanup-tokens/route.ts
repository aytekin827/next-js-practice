import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// 만료된 토큰 정리 (크론 작업용)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 만료된 토큰 삭제
    const { error } = await supabase
      .from('kis_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('만료된 토큰 정리 실패:', error);
      return NextResponse.json({ error: '토큰 정리 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '만료된 토큰이 정리되었습니다',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('토큰 정리 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 특정 사용자의 토큰 강제 삭제 (로그아웃 시 사용)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 해당 사용자의 토큰 삭제
    const { error } = await supabase
      .from('kis_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('사용자 토큰 삭제 실패:', error);
      return NextResponse.json({ error: '토큰 삭제 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '사용자 토큰이 삭제되었습니다'
    });
  } catch (error) {
    console.error('사용자 토큰 삭제 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}