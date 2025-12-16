import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getKISConfig, getKISAccessToken, createKISHeaders } from '@/utils/kis-config';

export async function GET(request: NextRequest) {
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
    const accessToken = await getKISAccessToken(kisConfig);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 계좌 잔고 조회 API 호출 (보유종목 포함)
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC8434R'; // 계좌잔고조회 TR_ID

    const queryParams = new URLSearchParams({
      'CANO': kisConfig.accountNumber,
      'ACNT_PRDT_CD': kisConfig.accountProductCode,
      'AFHR_FLPR_YN': 'N',
      'OFL_YN': '',
      'INQR_DVSN': '02',
      'UNPR_DVSN': '01',
      'FUND_STTL_ICLD_YN': 'N',
      'FNCG_AMT_AUTO_RDPT_YN': 'N',
      'PRCS_DVSN': '01',
      'CTX_AREA_FK100': '',
      'CTX_AREA_NK100': ''
    });

    const balanceResponse = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${queryParams}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'custtype': 'P', // 개인
        },
      }
    );

    if (!balanceResponse.ok) {
      console.error('KIS 보유종목 조회 실패:', balanceResponse.status);
      return NextResponse.json([]);
    }

    const balanceData = await balanceResponse.json();

    // KIS API 응답에서 보유종목 데이터 파싱
    const output1 = balanceData.output1 || [];

    const holdings = output1
      .filter((item: any) => parseInt(item.hldg_qty || '0') > 0) // 보유수량이 0보다 큰 것만
      .map((item: any, index: number) => ({
        id: `${item.pdno}_${index}`,
        symbol: item.pdno, // 상품번호 (종목코드)
        name: item.prdt_name || '알 수 없음', // 상품명
        quantity: parseInt(item.hldg_qty || '0'), // 보유수량
        currentPrice: parseInt(item.prpr || '0'), // 현재가
        avgPrice: parseFloat(item.pchs_avg_pric || '0'), // 매입평균가격
        marketValue: parseInt(item.evlu_amt || '0'), // 평가금액
        returnRate: parseFloat(item.evlu_pfls_rt || '0') // 평가손익률
      }));

    return NextResponse.json(holdings);
  } catch (error) {
    console.error('보유 종목 조회 실패:', error);
    return NextResponse.json([]);
  }
}