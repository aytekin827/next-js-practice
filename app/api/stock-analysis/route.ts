import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  changeRate: number;
  volume: number;
  marketCap: number;
  per: number;
  pbr: number;
}

interface AnalysisResult {
  symbol: string;
  name: string;
  score: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  reasons: string[];
  technicalIndicators: {
    rsi: number;
    macd: number;
    bollinger: 'UPPER' | 'MIDDLE' | 'LOWER';
  };
}

// 간단한 주식 분석 로직
function analyzeStock(stock: StockData): AnalysisResult {
  let score = 50; // 기본 점수
  const reasons: string[] = [];

  // PER 분석
  if (stock.per > 0 && stock.per < 15) {
    score += 15;
    reasons.push('PER이 낮아 저평가 상태');
  } else if (stock.per > 25) {
    score -= 10;
    reasons.push('PER이 높아 고평가 우려');
  }

  // PBR 분석
  if (stock.pbr > 0 && stock.pbr < 1) {
    score += 10;
    reasons.push('PBR 1 미만으로 저평가');
  } else if (stock.pbr > 3) {
    score -= 5;
    reasons.push('PBR이 높아 주의 필요');
  }

  // 등락률 분석
  if (stock.changeRate > 5) {
    score -= 5;
    reasons.push('단기 급등으로 조정 가능성');
  } else if (stock.changeRate < -5) {
    score += 5;
    reasons.push('단기 급락으로 반등 기대');
  } else if (Math.abs(stock.changeRate) < 2) {
    score += 5;
    reasons.push('안정적인 가격 움직임');
  }

  // 거래량 분석
  if (stock.volume > 1000000) {
    score += 5;
    reasons.push('높은 거래량으로 관심도 증가');
  }

  // 시가총액 분석
  if (stock.marketCap > 1000000000000) { // 1조원 이상
    score += 5;
    reasons.push('대형주로 안정성 높음');
  }

  // 점수 범위 조정
  score = Math.max(0, Math.min(100, score));

  // 추천 등급 결정
  let recommendation: 'BUY' | 'HOLD' | 'SELL';
  if (score >= 70) {
    recommendation = 'BUY';
  } else if (score >= 40) {
    recommendation = 'HOLD';
  } else {
    recommendation = 'SELL';
  }

  // 기술적 지표 시뮬레이션 (실제로는 차트 데이터 필요)
  const rsi = Math.random() * 100;
  const macd = (Math.random() - 0.5) * 2;
  const bollingerOptions: ('UPPER' | 'MIDDLE' | 'LOWER')[] = ['UPPER', 'MIDDLE', 'LOWER'];
  const bollinger = bollingerOptions[Math.floor(Math.random() * 3)];

  return {
    symbol: stock.symbol,
    name: stock.name,
    score,
    recommendation,
    reasons,
    technicalIndicators: {
      rsi,
      macd,
      bollinger
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { stocks, market } = await request.json();

    if (!Array.isArray(stocks)) {
      return NextResponse.json({ error: '유효하지 않은 주식 데이터입니다' }, { status: 400 });
    }

    // 각 주식에 대해 분석 실행
    const analysisResults: AnalysisResult[] = stocks.map(stock => analyzeStock(stock));

    // 점수 순으로 정렬
    analysisResults.sort((a, b) => b.score - a.score);

    return NextResponse.json(analysisResults);
  } catch (error) {
    console.error('주식 분석 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}