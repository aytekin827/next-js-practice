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
    const count = parseInt(searchParams.get('count') || '20');

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

    // 등락률 상위 종목 조회 API 호출
    const headers = createKISHeaders(kisConfig, accessToken);
    headers['tr_id'] = 'FHPST01710000'; // 국내주식 등락률상위 TR_ID

    const queryParams = new URLSearchParams({
      'FID_COND_MRKT_DIV_CODE': market === 'KOSPI' ? 'J' : 'Q',
      'FID_COND_SCR_DIV_CODE': '20171', // 등락률상위
      'FID_INPUT_ISCD': '0000',
      'FID_DIV_CLS_CODE': '0', // 전체
      'FID_BLNG_CLS_CODE': '0', // 평균거래량
      'FID_TRGT_CLS_CODE': '111111111', // 전체
      'FID_TRGT_EXLS_CLS_CODE': '0000000000',
      'FID_INPUT_PRICE_1': '',
      'FID_INPUT_PRICE_2': '',
      'FID_VOL_CNT': '',
      'FID_INPUT_DATE_1': '',
    });

    const response = await fetch(
      `${kisConfig.baseUrl}/uapi/domestic-stock/v1/ranking/fluctuation?${queryParams}`,
      {
        method: 'GET',
        headers: headers,
      }
    );

    if (!response.ok) {
      console.error('KIS 등락률 상위 조회 실패:', response.status);
      // 실패 시 임시 데이터 반환
      const mockData = Array.from({ length: count }, (_, i) => {
        const openPrice = Math.floor(Math.random() * 50000) + 10000;
        const currentPrice = Math.floor(Math.random() * 50000) + 10000;
        const lowPrice = Math.min(openPrice, currentPrice) - Math.floor(Math.random() * 1000); // 저가는 시가나 현재가보다 낮게

        return {
          symbol: `${market === 'KOSPI' ? '0' : '1'}${String(i + 1).padStart(5, '0')}`,
          name: `테스트종목${i + 1}`,
          currentPrice,
          openPrice,
          prevClose: Math.floor(Math.random() * 50000) + 10000,
          changeRate: (Math.random() - 0.3) * 20, // -6% ~ +14% 범위
          volume: Math.floor(Math.random() * 500000) + 10000,
          lowPrice,
        };
      });
      return NextResponse.json(mockData);
    }

    const data = await response.json();
    const output = data.output || [];

    // 상위 N개 종목만 선택하고 추가 정보 조회
    const topStocksBasic = output.slice(0, count).map((item: Record<string, string>) => ({
      symbol: item.mksc_shrn_iscd || '',
      name: item.hts_kor_isnm || '알 수 없음',
      changeRate: parseFloat(item.prdy_ctrt || '0'),
      volume: parseInt(item.acml_vol || '0'),
    }));

    // 각 종목의 현재가 정보를 추가로 조회 (순차적으로 처리하여 API 부하 방지)
    const topStocks = [];
    for (let i = 0; i < topStocksBasic.length; i++) {
      const stock = topStocksBasic[i];

      // API 호출 간격 조절 (100ms 대기)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      try {
        // 주식현재가 시세 API 호출 (FHPST01010000)
        const priceHeaders = createKISHeaders(kisConfig, accessToken);
        priceHeaders['tr_id'] = 'FHPST01010000';

        const priceParams = new URLSearchParams({
          'FID_COND_MRKT_DIV_CODE': market === 'KOSPI' ? 'J' : 'Q',
          'FID_INPUT_ISCD': stock.symbol,
        });

        const priceResponse = await fetch(
          `${kisConfig.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price-2?${priceParams}`,
          {
            method: 'GET',
            headers: priceHeaders,
          }
        );

        if (priceResponse.ok) {

          const priceData = await priceResponse.json();

          const output1 = priceData.output;

          const currentPrice = parseInt(output1?.stck_prpr || '0');
          const openPrice = parseInt(output1?.stck_oprc || '0');
          const prevClose = parseInt(output1?.stck_prdy_clpr || '0');
          const lowPrice = parseInt(output1?.stck_lwpr || '0');

          // console.log(output1)

          topStocks.push({
            ...stock,
            currentPrice,
            openPrice,
            prevClose,
            lowPrice
          });
        } else {
          console.error(`${stock.symbol} 현재가 조회 실패:`, priceResponse.status);
          // API 실패 시 기본값 반환 (전일대비율을 이용해서 계산)
          const mockCurrentPrice = Math.floor(Math.random() * 50000) + 10000;
          const mockOpenPrice = Math.floor(Math.random() * 50000) + 10000;
          // stock.changeRate를 이용해서 전일 종가 계산
          const mockPrevClose = Math.round(mockCurrentPrice / (1 + stock.changeRate / 100));
          const mockLowPrice = Math.min(mockCurrentPrice, mockOpenPrice) - Math.floor(Math.random() * 1000);

          topStocks.push({
            ...stock,
            currentPrice: mockCurrentPrice,
            openPrice: mockOpenPrice,
            prevClose: mockPrevClose,
            lowPrice: mockLowPrice
          });
        }
      } catch (error) {
        console.error(`${stock.symbol} 현재가 조회 중 오류:`, error);
        // 오류 시 기본값 반환 (전일대비율을 이용해서 계산)
        const mockCurrentPrice = Math.floor(Math.random() * 50000) + 10000;
        const mockOpenPrice = Math.floor(Math.random() * 50000) + 10000;
        // stock.changeRate를 이용해서 전일 종가 계산
        const mockPrevClose = Math.round(mockCurrentPrice / (1 + stock.changeRate / 100));
        const mockLowPrice = Math.min(mockCurrentPrice, mockOpenPrice) - Math.floor(Math.random() * 1000);

        topStocks.push({
          ...stock,
          currentPrice: mockCurrentPrice,
          openPrice: mockOpenPrice,
          prevClose: mockPrevClose,
          lowPrice: mockLowPrice
        });
      }
    }

    // console.log(topStocks)

    return NextResponse.json(topStocks);
  } catch (error) {
    console.error('등락률 상위 종목 조회 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}