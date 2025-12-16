import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken, createKISHeaders } from '@/utils/kis-config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { holdingId, quantity, symbol } = await request.json();

    if (!holdingId || !symbol) {
      return NextResponse.json({ error: '종목 정보가 필요합니다' }, { status: 400 });
    }

    // KIS 설정 가져오기
    const kisConfig = await getKISConfig(user.id);
    if (!kisConfig) {
      return NextResponse.json({
        error: 'KIS API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // KIS 액세스 토큰 발급 (캐시된 토큰 우선 사용)
    const accessToken = await getKISAccessToken(kisConfig, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 주식 매도 주문 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC0801U'; // 주식주문(현금) TR_ID

    const orderData = {
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'PDNO': symbol, // 종목코드
      'ORD_DVSN': '01', // 주문구분 (01: 시장가)
      'ORD_QTY': quantity?.toString() || '0', // 주문수량
      'ORD_UNPR': '0', // 주문단가 (시장가는 0)
    };

    const sellResponse = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData),
      }
    );

    if (!sellResponse.ok) {
      console.error('KIS 매도 주문 실패:', sellResponse.status);
      return NextResponse.json({
        error: 'KIS API 매도 주문에 실패했습니다'
      }, { status: 400 });
    }

    const sellData = await sellResponse.json();

    // KIS API 응답 확인
    if (sellData.rt_cd !== '0') {
      return NextResponse.json({
        error: `매도 주문 실패: ${sellData.msg1}`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '매도 주문이 전송되었습니다',
      orderId: sellData.output?.KRX_FWDG_ORD_ORGNO || `ORDER_${Date.now()}`,
      orderNumber: sellData.output?.ODNO || ''
    });
  } catch (error) {
    console.error('매도 주문 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}