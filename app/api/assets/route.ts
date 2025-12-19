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

    // KIS 액세스 토큰 발급 (캐시된 토큰 우선 사용)
    const accessToken = await getKISAccessToken(kisConfig, user.id);
    if (!accessToken) {
      return NextResponse.json({
        error: 'KIS API 인증에 실패했습니다. 설정을 확인해주세요.'
      }, { status: 400 });
    }

    // 계좌 잔고 조회 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'TTTC8494R'; // 계좌잔고조회 TR_ID

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
      'COST_ICLD_YN': '',
      'CTX_AREA_FK100': '',
      'CTX_AREA_NK100': ''
    });

    const balanceResponse = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl?${queryParams}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'custtype': 'P', // 개인
        },
      }
    );

    if (!balanceResponse.ok) {
      console.error('KIS 잔고 조회 실패:', balanceResponse.status);
      // 실패 시 임시 데이터 반환
      return NextResponse.json({
        totalAssets: 0,
        totalAssetsChange: 0,
        realizedPnL: 0,
        buyingPower: 0,
        totalReturn: 0,
        error: 'KIS API 호출 실패 - 임시 데이터 표시'
      });
    }

    const balanceData = await balanceResponse.json();

    // KIS API 응답 데이터 파싱
    const output2 = balanceData.output2?.[0] || {};

    const assetData = {
      totalAssets: parseInt(output2.tot_evlu_amt || '0'), // 총평가금액
      totalAssetsChange: parseInt(output2.evlu_pfls_smtl_amt || '0'), // 평가손익합계금액
      realizedPnL: parseInt(output2.rlzt_pfls || '0'), // 실현손익
      buyingPower: parseInt(output2.prvs_rcdl_excc_amt || '0'), // 주문가능현금
      totalReturn: parseFloat(output2.rlzt_erng_rt || '0') // 총평가손익률
    };

    return NextResponse.json(assetData);
  } catch (error) {
    console.error('자산 데이터 조회 실패:', error);

    // 오류 발생 시 임시 데이터 반환
    return NextResponse.json({
      totalAssets: 0,
      totalAssetsChange: 0,
      realizedPnL: 0,
      buyingPower: 0,
      totalReturn: 0,
      error: '데이터 조회 중 오류 발생'
    });
  }
}