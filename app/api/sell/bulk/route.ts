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

    const { orders } = await request.json();

    // 입력값 검증
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: '매도할 종목이 선택되지 않았습니다' },
        { status: 400 }
      );
    }

    // 각 주문 검증
    for (const order of orders) {
      if (!order.symbol || !order.quantity) {
        return NextResponse.json(
          { error: '종목코드와 수량은 필수입니다' },
          { status: 400 }
        );
      }

      if (order.quantity <= 0) {
        return NextResponse.json(
          { error: '수량은 0보다 커야 합니다' },
          { status: 400 }
        );
      }

      const orderType = order.orderType || 'limit';
      if (orderType === 'limit' && (!order.price || order.price <= 0)) {
        return NextResponse.json(
          { error: '지정가 주문 시 가격은 필수이며 0보다 커야 합니다' },
          { status: 400 }
        );
      }
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

    // 일괄 매도 주문 실행
    const orderResults = [];
    const failedOrders = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderType = order.orderType || 'limit';

      try {
        // 주식 매도 주문 API 호출
        const headers = createKISHeaders(kisConfig, accessToken);
        headers['tr_id'] = 'TTTC0801U'; // 주식주문(현금) 매도 TR_ID

        const orderData = {
          'CANO': kisConfig.accountNumber,
          'ACNT_PRDT_CD': kisConfig.accountProductCode,
          'PDNO': order.symbol, // 종목코드
          'ORD_DVSN': orderType === 'market' ? '01' : '00', // 주문구분 (01: 시장가, 00: 지정가)
          'ORD_QTY': order.quantity.toString(), // 주문수량
          'ORD_UNPR': orderType === 'market' ? '0' : order.price.toString(), // 주문단가
        };

        const response = await fetch(
          `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
          {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData),
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.rt_cd === '0') {
            const orderNumber = data.output?.ODNO || '';
            orderResults.push({
              orderId: orderNumber,
              symbol: order.symbol,
              quantity: order.quantity,
              price: orderType === 'market' ? 0 : order.price,
              orderType,
              status: 'success',
              orderTime: new Date().toISOString()
            });
          } else {
            failedOrders.push({
              symbol: order.symbol,
              error: data.msg1 || '알 수 없는 오류'
            });
          }
        } else {
          failedOrders.push({
            symbol: order.symbol,
            error: `API 호출 실패 (${response.status})`
          });
        }

        // API 호출 간격 조절 (초당 20건 제한 고려)
        if (i < orders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
        }
      } catch (error) {
        console.error(`매도 주문 실패 (${order.symbol}):`, error);
        failedOrders.push({
          symbol: order.symbol,
          error: '주문 처리 중 오류 발생'
        });
      }
    }

    // 결과 메시지 생성
    let message = '';
    if (orderResults.length === orders.length) {
      message = `${orders.length}개 종목의 매도 주문이 모두 성공했습니다`;
    } else if (orderResults.length > 0) {
      message = `${orderResults.length}개 종목 성공, ${failedOrders.length}개 종목 실패`;
    } else {
      message = '모든 매도 주문이 실패했습니다';
    }

    return NextResponse.json({
      success: orderResults.length > 0,
      message: message,
      successCount: orderResults.length,
      failedCount: failedOrders.length,
      orders: orderResults,
      failedOrders: failedOrders
    });
  } catch (error) {
    console.error('일괄 매도 주문 실패:', error);
    return NextResponse.json(
      { error: '일괄 매도 주문에 실패했습니다' },
      { status: 500 }
    );
  }
}