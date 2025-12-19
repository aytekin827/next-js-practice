import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken, createKISHeaders } from '@/utils/kis-config';
import { getKoreanDateString } from '@/utils/timezone';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // URL에서 날짜 파라미터 가져오기 (선택적)
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date');

    // 한국 시간 기준으로 날짜 설정
    const dateStr = requestedDate ?
      requestedDate.replace(/-/g, '') : // YYYY-MM-DD -> YYYYMMDD
      getKoreanDateString(); // 오늘 날짜

    console.log('거래 내역 조회 날짜:', dateStr);

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

    // 주식 당일 주문 체결 조회 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC8001R'; // 주식 당일 주문 체결 조회 TR_ID

    const queryParams = new URLSearchParams({
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'INQR_STRT_DT': dateStr, // 조회시작일자
      'INQR_END_DT': dateStr,  // 조회종료일자
      'SLL_BUY_DVSN_CD': '00', // 매도매수구분코드 (00: 전체)
      'INQR_DVSN': '00',       // 조회구분 (00: 역순)
      'PDNO': '',              // 상품번호 (전체)
      'CCLD_DVSN': '01',       // 체결구분 (01: 체결)
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
      const errorText = await response.text();
      console.error('KIS 거래 내역 조회 실패:', response.status, errorText);
      return NextResponse.json({
        error: `KIS API 호출에 실패했습니다: ${response.status}`
      }, { status: 400 });
    }

    const data = await response.json();
    console.log('KIS 거래 내역 API 응답:', JSON.stringify(data, null, 2));

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      console.error('KIS API 오류:', data);
      return NextResponse.json({
        error: `거래 내역 조회 실패: ${data.msg1 || data.msg_cd}`
      }, { status: 400 });
    }

    // 체결된 거래 데이터 파싱
    console.log('거래 내역 원본 데이터 개수:', data.output1?.length || 0);

    // 첫 번째 항목의 모든 필드 출력 (디버깅용)
    if (data.output1 && data.output1.length > 0) {
      console.log('첫 번째 거래 항목 전체 필드:', data.output1[0]);
    }

    const trades = (data.output1 || [])
      .filter((item: Record<string, string>) => {
        // 체결된 거래만 필터링 (체결수량이 0보다 큰 경우)
        const ccldQty = parseInt(item.tot_ccld_qty || '0');
        console.log('거래 항목 필터링:', {
          symbol: item.pdno,
          name: item.prdt_name,
          ccldQty: ccldQty,
          ordQty: item.ord_qty,
          sllBuyDvsn: item.sll_buy_dvsn_cd,
          avgPrvs: item.avg_prvs,
          ccldUnpr: item.ccld_unpr,
          totCcldAmt: item.tot_ccld_amt,
          allFields: Object.keys(item).slice(0, 10) // 처음 10개 필드명 출력
        });
        return ccldQty > 0;
      })
      .map((item: Record<string, string>) => {
        // KIS API 필드 매핑 수정
        const isBuy = item.sll_buy_dvsn_cd === '02'; // 02: 매수, 01: 매도
        const totalCcldQty = parseInt(item.tot_ccld_qty || '0');
        const ccldUnpr = parseFloat(item.avg_prvs || item.ccld_unpr || '0'); // 평균단가 또는 체결단가
        const totalAmount = parseFloat(item.tot_ccld_amt || '0') || (totalCcldQty * ccldUnpr); // 총체결금액

        // 주문상태 매핑
        let status: 'completed' | 'partial' | 'pending' = 'completed';
        const ordQty = parseInt(item.ord_qty || '0');
        if (totalCcldQty < ordQty && totalCcldQty > 0) {
          status = 'partial';
        }

        return {
          id: `${item.odno}_${item.ord_tmd}`, // 주문번호 + 시간으로 고유 ID 생성
          symbol: item.pdno || '', // 종목코드
          name: item.prdt_name || '', // 종목명
          type: isBuy ? 'buy' : 'sell',
          quantity: totalCcldQty, // 체결수량
          price: ccldUnpr, // 체결단가
          totalAmount: totalAmount, // 체결금액
          timestamp: `${item.ord_dt || dateStr} ${item.ord_tmd || '000000'}`, // 주문일시
          status: status,
          orderNumber: item.odno || '', // 주문번호
          orderQuantity: ordQty, // 주문수량
          remainingQuantity: ordQty - totalCcldQty, // 미체결수량
          // 추가 상세 정보
          orderType: item.ord_dvsn_name || '', // 주문구분명
          orderTime: item.ord_tmd || '', // 주문시각
          ccldTime: item.ccld_tmd || '', // 체결시각
          fee: parseFloat(item.tr_crcy_cd || '0'), // 거래수수료 (있다면)
          marketType: item.mkt_id || '', // 시장구분
        };
      })
      .sort((a: { timestamp: string }, b: { timestamp: string }) => {
        // 최신 거래부터 정렬 (시간 역순)
        return b.timestamp.localeCompare(a.timestamp);
      });

    console.log('필터링된 거래 내역 개수:', trades.length);

    // 디버깅을 위해 빈 배열인 경우 샘플 데이터 반환 (실제 운영에서는 제거)
    if (trades.length === 0) {
      console.log('거래 내역이 없어 빈 배열 반환');
    }

    return NextResponse.json(trades);
  } catch (error) {
    console.error('거래 내역 조회 실패:', error);
    return NextResponse.json(
      { error: '거래 내역 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}