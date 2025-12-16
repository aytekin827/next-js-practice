'use client';

import { useState, useEffect } from 'react';

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

export default function StockAnalysis() {
  const [selectedMarket, setSelectedMarket] = useState<'KOSPI' | 'KOSDAQ'>('KOSPI');
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string>('');

  // 주식 데이터 로딩
  const loadStockData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock-data?market=${selectedMarket}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setStockData(data);
      } else {
        console.error('주식 데이터 로딩 오류:', data.error);
        setStockData([]);
      }
    } catch (error) {
      console.error('주식 데이터 로딩 실패:', error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  // 주식 분석 실행
  const runAnalysis = async () => {
    if (stockData.length === 0) return;

    setAnalysisLoading(true);
    try {
      const response = await fetch('/api/stock-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stockData.slice(0, 10), // 상위 10개 종목만 분석
          market: selectedMarket
        }),
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setAnalysisResults(data);
      } else {
        console.error('분석 결과 오류:', data.error);
        setAnalysisResults([]);
      }
    } catch (error) {
      console.error('주식 분석 실패:', error);
      setAnalysisResults([]);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    loadStockData();
  }, [selectedMarket]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY': return 'text-green-400 bg-green-900/20';
      case 'HOLD': return 'text-yellow-400 bg-yellow-900/20';
      case 'SELL': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 space-y-6">
      {/* 컨트롤 패널 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📈 주식 데이터 분석</h2>
          <div className="flex items-center gap-4">
            {/* 시장 선택 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">시장:</span>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value as 'KOSPI' | 'KOSDAQ')}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="KOSPI">KOSPI</option>
                <option value="KOSDAQ">KOSDAQ</option>
              </select>
            </div>

            {/* 새로고침 버튼 */}
            <button
              onClick={loadStockData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? '로딩 중...' : '🔄 데이터 새로고침'}
            </button>

            {/* 분석 실행 버튼 */}
            <button
              onClick={runAnalysis}
              disabled={analysisLoading || stockData.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              {analysisLoading ? '분석 중...' : '🧠 AI 분석 실행'}
            </button>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded p-4">
            <div className="text-sm text-gray-400">총 종목 수</div>
            <div className="text-2xl font-bold">{stockData.length}</div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-sm text-gray-400">분석 완료</div>
            <div className="text-2xl font-bold">{analysisResults.length}</div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-sm text-gray-400">매수 추천</div>
            <div className="text-2xl font-bold text-green-400">
              {analysisResults.filter(r => r.recommendation === 'BUY').length}
            </div>
          </div>
          <div className="bg-gray-700 rounded p-4">
            <div className="text-sm text-gray-400">평균 점수</div>
            <div className="text-2xl font-bold">
              {analysisResults.length > 0
                ? Math.round(analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length)
                : 0
              }
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 주식 데이터 테이블 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">📊 {selectedMarket} 주요 종목</h3>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-gray-400">데이터 로딩 중...</div>
              </div>
            ) : stockData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                데이터가 없습니다
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">종목명</th>
                    <th className="text-right py-2">현재가</th>
                    <th className="text-right py-2">등락률</th>
                    <th className="text-right py-2">거래량</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.slice(0, 15).map((stock) => (
                    <tr key={stock.symbol} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2">
                        <div>
                          <div className="font-medium">{stock.name}</div>
                          <div className="text-xs text-gray-400">{stock.symbol}</div>
                        </div>
                      </td>
                      <td className="text-right py-2">
                        ₩{stock.currentPrice.toLocaleString()}
                      </td>
                      <td className={`text-right py-2 ${stock.changeRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {stock.changeRate >= 0 ? '+' : ''}{stock.changeRate.toFixed(2)}%
                      </td>
                      <td className="text-right py-2 text-gray-400">
                        {(stock.volume / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 분석 결과 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">🧠 AI 분석 결과</h3>
          <div className="space-y-4">
            {analysisLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-gray-400">AI 분석 중...</div>
              </div>
            ) : analysisResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                분석 결과가 없습니다<br />
                <span className="text-sm">상단의 "AI 분석 실행" 버튼을 클릭하세요</span>
              </div>
            ) : (
              analysisResults.map((result) => (
                <div key={result.symbol} className="bg-gray-700 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{result.name}</div>
                      <div className="text-sm text-gray-400">{result.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                        {result.score}점
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${getRecommendationColor(result.recommendation)}`}>
                        {result.recommendation}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="text-gray-300">분석 근거:</div>
                    {result.reasons.map((reason, index) => (
                      <div key={index} className="text-gray-400 text-xs">
                        • {reason}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-600 rounded p-2 text-center">
                      <div className="text-gray-400">RSI</div>
                      <div className={result.technicalIndicators.rsi > 70 ? 'text-red-400' :
                                   result.technicalIndicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}>
                        {result.technicalIndicators.rsi.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-2 text-center">
                      <div className="text-gray-400">MACD</div>
                      <div className={result.technicalIndicators.macd > 0 ? 'text-green-400' : 'text-red-400'}>
                        {result.technicalIndicators.macd.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-600 rounded p-2 text-center">
                      <div className="text-gray-400">볼린저</div>
                      <div className={
                        result.technicalIndicators.bollinger === 'UPPER' ? 'text-red-400' :
                        result.technicalIndicators.bollinger === 'LOWER' ? 'text-green-400' : 'text-yellow-400'
                      }>
                        {result.technicalIndicators.bollinger}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}