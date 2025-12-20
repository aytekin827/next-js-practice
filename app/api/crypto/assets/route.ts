import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUpbitConfig, createUpbitHeaders } from '@/utils/upbit-config';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Upbit 설정 가져오기
    const upbitConfig = await getUpbitConfig(user.id);
    if (!upbitConfig) {
      return NextResponse.json({
        error: 'Upbit API 설정이 필요합니다. 프로필에서 설정을 완료해주세요.'
      }, { status: 400 });
    }

    // Upbit 계좌 조회 API 호출
    const headers = createUpbitHeaders(upbitConfig);
    
    const response = await fetch(`${upbitConfig.baseUrl}/v1/accounts`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.error('Upbit 계좌 조회 실패:', response.status);
      return NextResponse.json({
        error: 'Upbit API 호출에 실패했습니다'
      }, { status: 400 });
    }

    const accounts = await response.json();

    // 현재가 정보 가져오기 (KRW 마켓만)
    const krwAccounts = accounts.filter((account: any) => 
      account.currency !== 'KRW' && parseFloat(account.balance) > 0
    );

    if (krwAccounts.length === 0) {
      return NextResponse.json([]);
    }

    const markets = krwAccounts.map((account: any) => `KRW-${account.currency}`).join(',');
    const tickerResponse = await fetch(`https://api.upbit.com/v1/ticker?markets=${markets}`);
    
    let tickerData: any[] = [];
    if (tickerResponse.ok) {
      tickerData = await tickerResponse.json();
    }

    // 데이터 조합
    const cryptoAssets = accounts
      .filter((account: any) => parseFloat(account.balance) > 0)
      .map((account: any) => {
        const ticker = tickerData.find((t: any) => t.market === `KRW-${account.currency}`);
        const currentPrice = ticker ? ticker.trade_price : 0;
        const avgBuyPrice = parseFloat(account.avg_buy_price) || 0;
        const balance = parseFloat(account.balance);
        const totalValue = currentPrice * balance;
        const investmentValue = avgBuyPrice * balance;
        const profitLoss = totalValue - investmentValue;
        const profitLossPercent = investmentValue > 0 ? (profitLoss / investmentValue) * 100 : 0;

        return {
          currency: account.currency,
          balance: balance,
          locked: parseFloat(account.locked) || 0,
          avgBuyPrice: avgBuyPrice,
          avgBuyPriceModified: account.avg_buy_price_modified,
          unitCurrency: account.unit_currency,
          currentPrice: currentPrice,
          totalValue: totalValue,
          profitLoss: profitLoss,
          profitLossPercent: profitLossPercent
        };
      });

    return NextResponse.json(cryptoAssets);
  } catch (error) {
    console.error('코인 자산 조회 실패:', error);
    return NextResponse.json(
      { error: '코인 자산 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}