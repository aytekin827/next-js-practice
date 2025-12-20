import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { markets, analysisType } = body;

    if (!markets || !Array.isArray(markets) || markets.length === 0) {
      return NextResponse.json({ error: '분석할 마켓을 선택해주세요' }, { status: 400 });
    }

    const results = [];

    for (const market of markets) {
      try {
        // Upbit API에서 시세 정보 가져오기
        const tickerResponse = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`);
        const tickerData = await tickerResponse.json();

        if (!tickerData || tickerData.length === 0) {
          continue;
        }

        const ticker = tickerData[0];

        // 캔들 데이터 가져오기 (기술적 분석용)
        const candleResponse = await fetch(
          `https://api.upbit.com/v1/candles/days?market=${market}&count=30`
        );
        const candleData = await candleResponse.json();

        // 기술적 지표 계산
        const rsi = calculateRSI(candleData);
        const macd = calculateMACD(candleData);
        const score = calculateScore(rsi, macd, ticker, analysisType);
        const recommendation = getRecommendationFromScore(score);

        results.push({
          market,
          currentPrice: ticker.trade_price,
          change24h: ticker.signed_change_rate * 100,
          volume24h: ticker.acc_trade_price_24h,
          high24h: ticker.high_price,
          low24h: ticker.low_price,
          rsi,
          macd: macd.signal,
          recommendation,
          score
        });

      } catch (error) {
        console.error(`${market} 분석 실패:`, error);
        continue;
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('코인 분석 실패:', error);
    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// RSI 계산 함수
function calculateRSI(candles: Array<{trade_price: number}>, period: number = 14): number {
  if (candles.length < period + 1) return 50;

  const prices = candles.reverse().map(c => c.trade_price);
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// MACD 계산 함수 (간단한 버전)
function calculateMACD(candles: Array<{trade_price: number}>): { signal: string; value: number } {
  if (candles.length < 26) return { signal: '중립', value: 0 };

  const prices = candles.reverse().map(c => c.trade_price);
  
  // EMA 계산
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // 간단한 신호 판단
  if (macdLine > 0) {
    return { signal: '골든크로스', value: macdLine };
  } else if (macdLine < 0) {
    return { signal: '데드크로스', value: macdLine };
  } else {
    return { signal: '중립', value: 0 };
  }
}

// EMA 계산 함수
function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// 점수 기반 추천 계산
function getRecommendationFromScore(score: number): 'buy' | 'sell' | 'hold' {
  if (score >= 70) return 'buy';
  if (score <= 30) return 'sell';
  return 'hold';
}

// 기존 추천 신호 계산 (참고용으로 유지)
function getRecommendation(rsi: number, macd: {signal: string; value: number}, ticker: {signed_change_rate: number}): 'buy' | 'sell' | 'hold' {
  let buySignals = 0;
  let sellSignals = 0;

  // RSI 신호
  if (rsi < 30) buySignals++;
  if (rsi > 70) sellSignals++;

  // MACD 신호
  if (macd.signal === '골든크로스') buySignals++;
  if (macd.signal === '데드크로스') sellSignals++;

  // 가격 변동 신호
  if (ticker.signed_change_rate > 0.05) sellSignals++;
  if (ticker.signed_change_rate < -0.05) buySignals++;

  if (buySignals > sellSignals) return 'buy';
  if (sellSignals > buySignals) return 'sell';
  return 'hold';
}

// 종합 점수 계산
function calculateScore(rsi: number, macd: {signal: string; value: number}, ticker: {acc_trade_price_24h: number; signed_change_rate: number}, analysisType: string): number {
  let score = 50; // 기본 점수

  // RSI 점수
  if (rsi < 30) score += 20;
  else if (rsi > 70) score -= 20;
  else if (rsi >= 40 && rsi <= 60) score += 10;

  // MACD 점수
  if (macd.signal === '골든크로스') score += 15;
  else if (macd.signal === '데드크로스') score -= 15;

  // 거래량 점수
  if (ticker.acc_trade_price_24h > 100000000000) score += 10; // 1000억 이상

  // 가격 변동 점수
  const changeRate = Math.abs(ticker.signed_change_rate);
  if (changeRate > 0.1) score -= 10; // 너무 큰 변동은 위험
  else if (changeRate > 0.03) score += 5; // 적당한 변동은 기회

  // 분석 타입별 가중치
  if (analysisType === 'technical') {
    // 기술적 분석에 더 가중치
    score = score * 1.2;
  } else if (analysisType === 'volume') {
    // 거래량 분석에 더 가중치
    if (ticker.acc_trade_price_24h > 50000000000) score += 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}