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

    const { symbol, quantity, price, orderType, sellEnabled, sellPrice, sellProfitPercent, stopLossEnabled, stopLossPrice, stopLossPercent } = await request.json();

    if (!symbol || !quantity) {
      return NextResponse.json({ error: '종목코드와 수량은 필수입니다' }, { status: 400 });
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

    // 주식 매수 주문 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC0802U'; // 주식주문(현금) 매수 TR_ID

    const orderData = {
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'PDNO': symbol, // 종목코드
      'ORD_DVSN': orderType === 'market' ? '01' : '00', // 주문구분 (01: 시장가, 00: 지정가)
      'ORD_QTY': quantity.toString(), // 주문수량
      'ORD_UNPR': orderType === 'market' ? '0' : price.toString(), // 주문단가
    };

    const buyResponse = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(orderData),
      }
    );

    if (!buyResponse.ok) {
      console.error('KIS 매수 주문 실패:', buyResponse.status);
      return NextResponse.json({
        error: 'KIS API 매수 주문에 실패했습니다'
      }, { status: 400 });
    }

    const buyData = await buyResponse.json();

    // KIS API 응답 확인
    if (buyData.rt_cd !== '0') {
      return NextResponse.json({
        error: `매수 주문 실패: ${buyData.msg1}`
      }, { status: 400 });
    }

    const buyOrderNumber = buyData.output?.ODNO || '';
    let sellOrderNumber = '';
    let sellOrderSuccess = true;
    let stopLossOrderNumber = '';
    let stopLossOrderSuccess = true;

    // 익절 매도 주문 처리 (활성화된 경우)
    if (sellEnabled && sellPrice > 0) {
      try {
        // 익절 매도 주문 API 호출
        const sellHeaders = createKISHeaders(kisConfig, accessToken);
        sellHeaders['tr_id'] = 'TTTC0801U'; // 주식주문(현금) 매도 TR_ID

        const sellOrderData = {
          'CANO': kisConfig.accountNumber,
          'ACNT_PRDT_CD': kisConfig.accountProductCode,
          'PDNO': symbol, // 종목코드
          'ORD_DVSN': '00', // 지정가 매도
          'ORD_QTY': quantity.toString(), // 주문수량
          'ORD_UNPR': sellPrice.toString(), // 익절가격
        };

        const sellResponse = await fetch(
          `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
          {
            method: 'POST',
            headers: sellHeaders,
            body: JSON.stringify(sellOrderData),
          }
        );

        if (sellResponse.ok) {
          const sellData = await sellResponse.json();
          if (sellData.rt_cd === '0') {
            sellOrderNumber = sellData.output?.ODNO || '';
          } else {
            console.error('익절 매도 주문 실패:', sellData.msg1);
            sellOrderSuccess = false;
          }
        } else {
          console.error('익절 매도 주문 API 호출 실패:', sellResponse.status);
          sellOrderSuccess = false;
        }
      } catch (error) {
        console.error('익절 매도 주문 중 오류:', error);
        sellOrderSuccess = false;
      }
    }

    // 손절 매도 주문 처리 (활성화된 경우)
    if (stopLossEnabled && stopLossPrice > 0) {
      try {
        // 손절 매도 주문 API 호출
        const stopLossHeaders = createKISHeaders(kisConfig, accessToken);
        stopLossHeaders['tr_id'] = 'TTTC0801U'; // 주식주문(현금) 매도 TR_ID

        const stopLossOrderData = {
          'CANO': kisConfig.accountNumber,
          'ACNT_PRDT_CD': kisConfig.accountProductCode,
          'PDNO': symbol, // 종목코드
          'ORD_DVSN': '00', // 지정가 매도
          'ORD_QTY': quantity.toString(), // 주문수량
          'ORD_UNPR': stopLossPrice.toString(), // 손절가격
        };

        const stopLossResponse = await fetch(
          `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
          {
            method: 'POST',
            headers: stopLossHeaders,
            body: JSON.stringify(stopLossOrderData),
          }
        );

        if (stopLossResponse.ok) {
          const stopLossData = await stopLossResponse.json();
          if (stopLossData.rt_cd === '0') {
            stopLossOrderNumber = stopLossData.output?.ODNO || '';
          } else {
            console.error('손절 매도 주문 실패:', stopLossData.msg1);
            stopLossOrderSuccess = false;
          }
        } else {
          console.error('손절 매도 주문 API 호출 실패:', stopLossResponse.status);
          stopLossOrderSuccess = false;
        }
      } catch (error) {
        console.error('손절 매도 주문 중 오류:', error);
        stopLossOrderSuccess = false;
      }
    }

    // 메시지 생성
    let message = '매수 주문이 전송되었습니다';
    if (sellEnabled && stopLossEnabled) {
      if (sellOrderSuccess && stopLossOrderSuccess) {
        message = '매수+익절+손절 주문이 모두 전송되었습니다';
      } else if (sellOrderSuccess || stopLossOrderSuccess) {
        message = '매수 주문은 성공했으나 일부 매도 주문에 실패했습니다';
      } else {
        message = '매수 주문은 성공했으나 매도 주문들에 실패했습니다';
      }
    } else if (sellEnabled) {
      message = sellOrderSuccess ? '매수+익절 주문이 전송되었습니다' : '매수 주문은 성공했으나 익절 주문에 실패했습니다';
    } else if (stopLossEnabled) {
      message = stopLossOrderSuccess ? '매수+손절 주문이 전송되었습니다' : '매수 주문은 성공했으나 손절 주문에 실패했습니다';
    }

    return NextResponse.json({
      success: true,
      message: message,
      buyOrderNumber: buyOrderNumber,
      sellOrderNumber: sellOrderNumber,
      sellOrderSuccess: sellOrderSuccess,
      stopLossOrderNumber: stopLossOrderNumber,
      stopLossOrderSuccess: stopLossOrderSuccess
    });
  } catch (error) {
    console.error('매수 주문 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}