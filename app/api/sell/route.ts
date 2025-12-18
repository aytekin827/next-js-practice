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

    const { symbol, quantity, price, orderType = 'limit' } = await request.json();

    // 입력값 검증
    if (!symbol || !quantity) {
      return NextResponse.json(
        { error: '종목코드와 수량은 필수입니다' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: '수량은 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    if (orderType === 'limit' && (!price || price <= 0)) {
      return NextResponse.json(
        { error: '지정가 주문 시 가격은 필수이며 0보다 커야 합니다' },
        { status: 400 }
      );
    }

    // KIS 설정 가져오기
    const kisConfig = await getKISConfig(user.id);
    if (!kisConfig) {
      return NextResponse.json({
        error: 'KIS API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // KIS 액세스 토큰 발급
    const accessToken = await getKISAccessToken(kisConfig, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 주식 매도 주문 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC0801U'; // 주식주문(현금) 매도 TR_ID

    const orderData = {
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'PDNO': symbol, // 종목코드
      'ORD_DVSN': orderType === 'market' ? '01' : '00', // 주문구분 (01: 시장가, 00: 지정가)
      'ORD_QTY': quantity.toString(), // 주문수량
      'ORD_UNPR': orderType === 'market' ? '0' : price.toString(), // 주문단가
    };

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData),
      }
    );

    if (!response.ok) {
      console.error('KIS 매도 주문 실패:', response.status);
      return NextResponse.json({
        error: 'KIS API 매도 주문에 실패했습니다'
      }, { status: 400 });
    }

    const data = await response.json();

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      return NextResponse.json({
        error: `매도 주문 실패: ${data.msg1}`
      }, { status: 400 });
    }

    const orderNumber = data.output?.ODNO || '';

    return NextResponse.json({
      success: true,
      message: '매도 주문이 접수되었습니다',
      order: {
        orderId: orderNumber,
        symbol,
        quantity,
        price: orderType === 'market' ? 0 : price,
        orderType,
        status: 'pending',
        orderTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('매도 주문 실패:', error);
    return NextResponse.json(
      { error: '매도 주문에 실패했습니다' },
      { status: 500 }
    );
  }
}