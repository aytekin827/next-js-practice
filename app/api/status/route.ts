import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 간단한 상태 체크 - 서버가 응답하면 온라인
    return NextResponse.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      message: 'API 서버가 정상 작동 중입니다'
    });
  } catch (error) {
    console.error('API 상태 체크 오류:', error);
    return NextResponse.json({
      status: 'offline',
      timestamp: new Date().toISOString(),
      message: 'API 서버 오류'
    }, { status: 500 });
  }
}