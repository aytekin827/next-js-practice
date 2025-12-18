import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken, createKISHeaders } from '@/utils/kis-config';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
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

    // 미체결 주문 조회 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC8001R'; // 주식 당일 주문 체결 조회 TR_ID

    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');

    const queryParams = new URLSearchParams({
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'INQR_STRT_DT': dateStr, // 조회시작일자 (오늘)
      'INQR_END_DT': dateStr,  // 조회종료일자 (오늘)
      'SLL_BUY_DVSN_CD': '02', // 매도매수구분코드 (02: 매도)
      'INQR_DVSN': '00',       // 조회구분 (00: 역순)
      'PDNO': '',              // 상품번호 (전체)
      'CCLD_DVSN': '01',       // 체결구분 (01: 미체결)
      'ORD_GNO_BRNO': '',      // 주문채번지점번호
      'ODNO': '',              // 주문번호
      'INQR_DVSN_3': '00',     // 조회구분3
      'INQR_DVSN_1': '',       // 조회구분1
      'CTX_AREA_FK100': '',    // 연속조회검색조건100
      'CTX_AREA_NK100': ''     // 연속조회키100
    });

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${queryParams}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'custtype': 'P', // 개인
        },
      }
    );

    if (!response.ok) {
      console.error('KIS 미체결 주문 조회 실패:', response.status);
      return NextResponse.json({
        error: 'KIS API 호출에 실패했습니다'
      }, { status: 400 });
    }

    const data = await response.json();

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      return NextResponse.json({
        error: `미체결 주문 조회 실패: ${data.msg1}`
      }, { status: 400 });
    }

    // 미체결 매도 주문 데이터 파싱
    const pendingOrders = (data.output1 || [])
      .filter((item: Record<string, string>) => item.sll_buy_dvsn_cd === '02') // 매도 주문만
      .map((item: Record<string, string>) => {
        // 주문상태 매핑
        let status: 'pending' | 'partial' | 'completed' | 'cancelled' = 'pending';
        const orderStatus = item.ord_dvsn_name || '';
        
        if (orderStatus.includes('취소')) {
          status = 'cancelled';
        } else if (orderStatus.includes('체결')) {
          status = 'completed';
        } else if (parseInt(item.tot_ccld_qty || '0') > 0) {
          status = 'partial';
        }

        return {
          id: item.odno || '', // 주문번호
          symbol: item.pdno || '', // 종목코드
          name: item.prdt_name || '', // 종목명
          quantity: parseInt(item.ord_qty || '0'), // 주문수량
          sellPrice: parseFloat(item.ord_unpr || '0'), // 주문단가
          orderTime: `${item.ord_dt || ''} ${item.ord_tmd || ''}`, // 주문일시
          status: status,
          executedQuantity: parseInt(item.tot_ccld_qty || '0'), // 체결수량
          remainingQuantity: parseInt(item.psbl_qty || '0') // 잔여수량
        };
      });

    return NextResponse.json(pendingOrders);
  } catch (error) {
    console.error('매도 주문 조회 실패:', error);
    return NextResponse.json(
      { error: '매도 주문 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}