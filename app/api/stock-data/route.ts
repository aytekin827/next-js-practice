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

    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'KOSPI';

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

    // 주식 현재가 시세 조회 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'FHKST01010100'; // 주식현재가 시세 TR_ID

    // 임시로 주요 종목들의 데이터를 가져오기
    const majorStocks = market === 'KOSPI'
      ? ['005930', '000660', '035420', '005490', '051910', '068270', '035720', '028260', '006400', '105560']
      : ['247540', '086520', '091990', '263750', '196170', '357780', '041510', '293490', '112040', '058470'];

    const stockData = [];

    for (const symbol of majorStocks) {
      try {
        const queryParams = new URLSearchParams({
          'FID_COND_MRKT_DIV_CODE': market === 'KOSPI' ? 'J' : 'Q',
          'FID_INPUT_ISCD': symbol,
        });

        const response = await fetch(
          `${kisConfig.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?${queryParams}`,
          {
            method: 'GET',
            headers: headers,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const output = data.output;

          if (output) {
            stockData.push({
              symbol: symbol,
              name: output.hts_kor_isnm || '알 수 없음',
              currentPrice: parseInt(output.stck_prpr || '0'),
              changeRate: parseFloat(output.prdy_ctrt || '0'),
              volume: parseInt(output.acml_vol || '0'),
              marketCap: parseInt(output.hts_avls || '0'),
              per: parseFloat(output.per || '0'),
              pbr: parseFloat(output.pbr || '0'),
            });
          }
        }

        // API 호출 제한을 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`종목 ${symbol} 데이터 조회 실패:`, error);
      }
    }

    // 데이터가 없으면 임시 데이터 반환
    if (stockData.length === 0) {
      const mockData = majorStocks.map((symbol, index) => ({
        symbol,
        name: `종목${index + 1}`,
        currentPrice: Math.floor(Math.random() * 100000) + 10000,
        changeRate: (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000000),
        marketCap: Math.floor(Math.random() * 10000000000),
        per: Math.random() * 30,
        pbr: Math.random() * 5,
      }));

      return NextResponse.json(mockData);
    }

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('주식 데이터 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}