'use client';

import { useState } from 'react';

interface AnalysisResult {
  market: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  rsi: number;
  macd: string;
  recommendation: 'buy' | 'sell' | 'hold';
  score: number;
}

export default function CryptoAnalysis() {
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['KRW-BTC', 'KRW-ETH']);
  const [customMarket, setCustomMarket] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1d');
  const [analysisType, setAnalysisType] = useState<'technical' | 'volume' | 'comprehensive'>('comprehensive');

  const popularMarkets = [
    { code: 'KRW-BTC', name: '비트코인' },
    { code: 'KRW-ETH', name: '이더리움' },
    { code: 'KRW-XRP', name: '리플' },
    { code: 'KRW-ADA', name: '에이다' },
    { code: 'KRW-SOL', name: '솔라나' },
    { code: 'KRW-AVAX', name: '아발란체' },
    { code: 'KRW-DOGE', name: '도지코인' },
    { code: 'KRW-SHIB', name: '시바이누' },
  ];

  const toggleMarket = (market: string) => {
    if (selectedMarkets.includes(market)) {
      setSelectedMarkets(selectedMarkets.filter(m => m !== market));
    } else {
      setSelectedMarkets([...selectedMarkets, market]);
    }
  };

  const addCustomMarket = () => {
    if (customMarket && !selectedMarkets.includes(customMarket)) {
      setSelectedMarkets([...selectedMarkets, customMarket]);
      setCustomMarket('');
    }
  };

  const startAnalysis = async () => {
    if (selectedMarkets.length === 0) {
      alert('분석할 코인을 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults([]);

    try {
      const response = await fetch('/api/crypto/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markets: selectedMarkets,
          timeframe,
          analysisType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResults(data.results || []);
      } else {
        alert('분석 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('분석 실패:', error);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'buy':
        return 'text-red-400 bg-red-900/30';
      case 'sell':
        return 'text-blue-400 bg-blue-900/30';
      default:
        return 'text-gray-400 bg-gray-700';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'buy':
        return '매수 추천';
      case 'sell':
        return '매도 추천';
      default:
        return '관망';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">📊 코인시장 분석</h1>
        <p className="text-gray-400 mt-1">기술적 분석 및 시장 동향 파악</p>
      </div>

      {/* 분석 설정 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 코인 선택 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">분석 대상 코인 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularMarkets.map((market) => (
              <button
                key={market.code}
                onClick={() => toggleMarket(market.code)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedMarkets.includes(market.code)
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="font-semibold text-sm">{market.name}</div>
                <div className="text-xs opacity-75">{market.code}</div>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">
              선택된 코인: {selectedMarkets.length}개
            </div>
            {selectedMarkets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMarkets.map((market) => (
                  <span
                    key={market}
                    className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2"
                  >
                    {market}
                    <button
                      onClick={() => toggleMarket(market)}
                      className="hover:bg-orange-700 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* 커스텀 코인 추가 */}
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">다른 코인 추가</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMarket}
                onChange={(e) => setCustomMarket(e.target.value.toUpperCase())}
                placeholder="예: KRW-DOGE, KRW-SHIB"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              />
              <button
                onClick={addCustomMarket}
                disabled={!customMarket}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                추가
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              • Upbit 마켓 코드 형식: KRW-코인심볼 (예: KRW-DOGE)
              <br />
              • 정확한 코인 심볼을 입력해주세요
            </div>
          </div>
        </div>

        {/* 분석 옵션 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">분석 옵션</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                시간 프레임
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as '1h' | '4h' | '1d')}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="1h">1시간</option>
                <option value="4h">4시간</option>
                <option value="1d">1일</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                분석 유형
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value as 'technical' | 'volume' | 'comprehensive')}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="technical">기술적 분석</option>
                <option value="volume">거래량 분석</option>
                <option value="comprehensive">종합 분석</option>
              </select>
            </div>

            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || selectedMarkets.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors mb-3"
            >
              {isAnalyzing ? '분석 중...' : '분석 시작'}
            </button>

            <button
              onClick={() => setShowMethodModal(true)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
            >
              📖 분석 방법 설명
            </button>
          </div>
        </div>
      </div>

      {/* 분석 결과 */}
      {isAnalyzing && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="text-lg">시장 데이터 분석 중...</span>
          </div>
        </div>
      )}

      {!isAnalyzing && analysisResults.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">분석 결과</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-2">코인</th>
                  <th className="text-right py-3 px-2">현재가</th>
                  <th className="text-right py-3 px-2">24h 변동</th>
                  <th className="text-right py-3 px-2">거래량</th>
                  <th className="text-center py-3 px-2">RSI</th>
                  <th className="text-center py-3 px-2">MACD</th>
                  <th className="text-center py-3 px-2">점수</th>
                  <th className="text-center py-3 px-2">추천</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.map((result, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-semibold">{result.market}</td>
                    <td className="py-3 px-2 text-right">
                      ₩{result.currentPrice.toLocaleString()}
                    </td>
                    <td className={`py-3 px-2 text-right font-semibold ${
                      result.change24h > 0 ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {result.change24h > 0 ? '+' : ''}{result.change24h.toFixed(2)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      ₩{(result.volume24h / 1000000).toFixed(0)}M
                    </td>
                    <td className={`py-3 px-2 text-center font-semibold ${
                      result.rsi > 70 ? 'text-red-400' :
                      result.rsi < 30 ? 'text-blue-400' :
                      'text-gray-300'
                    }`}>
                      {result.rsi.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-center">{result.macd}</td>
                    <td className="py-3 px-2 text-center font-bold text-orange-400">
                      {result.score}/100
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        getRecommendationColor(result.recommendation)
                      }`}>
                        {getRecommendationText(result.recommendation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 분석 지표 해석 (축소) */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-md font-semibold mb-3">📚 분석 지표 해석</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <h4 className="font-semibold text-orange-400 mb-1">RSI (상대강도지수)</h4>
            <ul className="text-gray-400 space-y-0.5">
              <li>• <span className="text-red-400">70 이상</span>: 과매수 (매도 신호)</li>
              <li>• <span className="text-blue-400">30 이하</span>: 과매도 (매수 신호)</li>
              <li>• <span className="text-gray-300">30-70</span>: 중립 구간</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-orange-400 mb-1">MACD</h4>
            <ul className="text-gray-400 space-y-0.5">
              <li>• <span className="text-red-400">골든크로스</span>: 상승 추세</li>
              <li>• <span className="text-blue-400">데드크로스</span>: 하락 추세</li>
              <li>• <span className="text-gray-300">중립</span>: 추세 불분명</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-orange-400 mb-1">종합 추천</h4>
            <ul className="text-gray-400 space-y-0.5">
              <li>• <span className="text-red-400">70점 이상</span>: 매수 추천</li>
              <li>• <span className="text-blue-400">30점 이하</span>: 매도 추천</li>
              <li>• <span className="text-gray-300">30-70점</span>: 관망 추천</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 분석 방법 설명 모달 */}
      {showMethodModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMethodModal(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🔍 분석 방법 설명</h3>
                <button
                  onClick={() => setShowMethodModal(false)}
                  className="text-gray-400 hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold text-orange-400 mb-3">📊 데이터 수집</h4>
                  <ul className="text-gray-400 space-y-2">
                    <li>• <strong>실시간 시세</strong>: Upbit API에서 현재가, 24시간 변동률, 거래량 수집</li>
                    <li>• <strong>캔들 데이터</strong>: 최근 30일간의 일봉 데이터로 기술적 지표 계산</li>
                    <li>• <strong>거래량 분석</strong>: 24시간 누적 거래대금으로 시장 활성도 측정</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-400 mb-3">🧮 기술적 지표 계산</h4>
                  <ul className="text-gray-400 space-y-2">
                    <li>• <strong>RSI</strong>: 14일 기준 상대강도지수 계산</li>
                    <li>• <strong>MACD</strong>: 12일/26일 EMA 기반 추세 분석</li>
                    <li>• <strong>가격 모멘텀</strong>: 24시간 변동률로 단기 추세 파악</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h4 className="font-semibold text-orange-400 mb-3">🎯 종합 점수 산출 방식</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                  <div>
                    <strong className="text-white">기본 점수: 50점</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• RSI &lt; 30: +20점 (과매도)</li>
                      <li>• RSI &gt; 70: -20점 (과매수)</li>
                      <li>• RSI 40-60: +10점 (안정)</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-white">MACD 신호</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• 골든크로스: +15점</li>
                      <li>• 데드크로스: -15점</li>
                      <li>• 중립: 0점</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-white">추가 요소</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• 고거래량: +10점</li>
                      <li>• 적정변동: +5점</li>
                      <li>• 과도변동: -10점</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700">
                <h4 className="font-semibold text-blue-400 mb-2">⚠️ 투자 유의사항</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• 이 분석은 참고용이며, 투자 결정의 유일한 근거가 되어서는 안 됩니다</li>
                  <li>• 암호화폐 투자는 높은 변동성과 손실 위험을 수반합니다</li>
                  <li>• 투자 전 충분한 조사와 위험 관리가 필요합니다</li>
                  <li>• 본인의 투자 성향과 재정 상황을 고려하여 신중하게 결정하세요</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700">
              <button
                onClick={() => setShowMethodModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
