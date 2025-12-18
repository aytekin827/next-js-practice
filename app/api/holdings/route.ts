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

    // 계좌 잔고 조회 API 호출 (보유 종목 포함)
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC8434R'; // 주식잔고조회 TR_ID

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
      'COST_ICLD_YN': 'N',
      'CTX_AREA_FK100': '',
      'CTX_AREA_NK100': ''
    });

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance?${queryParams}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'custtype': 'P', // 개인
        },
      }
    );

    if (!response.ok) {
      console.error('KIS 보유 종목 조회 실패:', response.status);
      return NextResponse.json({
        error: 'KIS API 호출에 실패했습니다'
      }, { status: 400 });
    }

    const data = await response.json();

    // KIS API 응답 확인
    if (data.rt_cd !== '0') {
      return NextResponse.json({
        error: `보유 종목 조회 실패: ${data.msg1}`
      }, { status: 400 });
    }

    // 보유 종목 데이터 파싱
    const holdings = (data.output1 || [])
      .filter((item: Record<string, string>) => parseInt(item.hldg_qty) > 0) // 보유수량이 0보다 큰 것만
      .map((item: Record<string, string>) => {
        const quantity = parseInt(item.hldg_qty || '0');
        const avgPrice = parseFloat(item.pchs_avg_pric || '0');
        const currentPrice = parseFloat(item.prpr || '0');
        const totalValue = currentPrice * quantity;
        const profitLoss = parseFloat(item.evlu_pfls_amt || '0');
        const profitLossPercent = parseFloat(item.evlu_pfls_rt || '0');

        return {
          symbol: item.pdno || '', // 종목코드
          name: item.prdt_name || '', // 종목명
          quantity: quantity, // 보유수량
          avgPrice: avgPrice, // 평균단가
          currentPrice: currentPrice, // 현재가
          totalValue: totalValue, // 평가금액
          profitLoss: profitLoss, // 평가손익
          profitLossPercent: profitLossPercent // 평가손익률
        };
      });

    return NextResponse.json(holdings);
  } catch (error) {
    console.error('보유 종목 조회 실패:', error);
    return NextResponse.json(
      { error: '보유 종목 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}