'use client';

import { useState, useEffect, useRef } from 'react';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  openPrice: number;
  prevClose: number;
  changeRate: number;
  volume: number;
  lowPrice: number;
}

interface AnalysisSettings {
  market: 'KOSPI' | 'KOSDAQ';
  stockCount: number;
  gapRangeMin: number;
  gapRangeMax: number;
  minVolume: number;
}

interface FilteredStock extends StockData {
  gapPercent: number;
  meetsGapCondition: boolean;
  meetsVolumeCondition: boolean;
  isRising: boolean;
  isBreakingOut: boolean;
  hasLowBelowOpen: boolean;
}

export default function StockAnalysis() {
  const [settings, setSettings] = useState<AnalysisSettings>({
    market: 'KOSPI',
    stockCount: 20,
    gapRangeMin: 3,
    gapRangeMax: 7,
    minVolume: 50000,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [topStocks, setTopStocks] = useState<StockData[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<FilteredStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<FilteredStock | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buySettings, setBuySettings] = useState({
    orderType: 'market' as 'market' | 'limit',
    price: 0,
    quantity: 1,
    // 매도 설정
    sellEnabled: true,
    sellProfitPercent: 1, // 기본 1% 상승
    sellPrice: 0,
  });

  // 카운트다운 타이머 상태
  const [countdown, setCountdown] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 등락률 상위 종목 조회 (분석 시작 시 한 번만)
  const fetchTopStocks = async () => {
    try {
      const response = await fetch(`/api/stock-ranking?market=${settings.market}&count=${settings.stockCount}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setTopStocks(data);
        return data;
      } else {
        console.error('상위 종목 조회 오류:', data.error);
        return [];
      }
    } catch (error) {
      console.error('상위 종목 조회 실패:', error);
      return [];
    }
  };

  // 종목 필터링 로직
  const filterStocks = (stocks: StockData[]): FilteredStock[] => {
    console.log(stocks)
    return stocks.map(stock => {
      // 시가 갭 계산 (시가가 전일 종가 대비 상승 퍼센트)
      const gapPercent = stock.prevClose > 0
        ? ((stock.openPrice - stock.prevClose) / stock.prevClose) * 100
        : 0;

      const meetsGapCondition = gapPercent >= settings.gapRangeMin && gapPercent <= settings.gapRangeMax;
      const meetsVolumeCondition = stock.volume >= settings.minVolume;
      const isRising = stock.changeRate > 0; // 상승하는 종목만 선택
      const isBreakingOut = stock.currentPrice >= stock.openPrice; // 현재가가 시가보다 크거나 같아야 함 (돌파 조건)
      const hasLowBelowOpen = stock.lowPrice < stock.openPrice; // 오늘 저가가 시가보다 낮았던 적이 있는지

      return {
        ...stock,
        gapPercent,
        meetsGapCondition,
        meetsVolumeCondition,
        isRising,
        isBreakingOut,
        hasLowBelowOpen,
      };
    }).filter(stock => stock.meetsGapCondition && stock.meetsVolumeCondition && stock.isRising && stock.isBreakingOut && stock.hasLowBelowOpen);
  };

  // 주기적 데이터 업데이트 및 필터링 실행
  const runPeriodicUpdate = async () => {
    try {
      // 새로운 데이터를 API에서 가져오기
      const freshStocks = await fetchTopStocks();
      console.log(freshStocks)
      if (freshStocks.length > 0) {
        setTopStocks(freshStocks);
        const filtered = filterStocks(freshStocks);
        setFilteredStocks(filtered);
      }
    } catch (error) {
      console.error('주기적 업데이트 실패:', error);
      // 실패 시 기존 데이터로 필터링만 수행
      if (topStocks.length > 0) {
        const filtered = filterStocks(topStocks);
        setFilteredStocks(filtered);
      }
    }
  };

  // 카운트다운 시작
  const startCountdown = () => {
    setCountdown(10); // 10초부터 시작

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 10; // 0이 되면 다시 10으로 리셋
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 카운트다운 중지
  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  };

  // 분석 시작/중지
  const toggleAnalysis = async () => {
    if (isAnalyzing) {
      // 분석 중지
      setIsAnalyzing(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopCountdown();
    } else {
      // 분석 시작
      setIsAnalyzing(true);
      setInitialLoading(true);

      // 1. 등락률 상위 종목 조회 (한 번만)
      const stocks = await fetchTopStocks();
      console.log(stocks)
      setInitialLoading(false);


      if (stocks.length > 0) {
        // 2. 초기 필터링
        const filtered = filterStocks(stocks);
        setFilteredStocks(filtered);

        // 3. 카운트다운 시작
        startCountdown();

        // 4. 주기적 데이터 업데이트 시작 (10초마다)
        intervalRef.current = setInterval(() => {
          runPeriodicUpdate();
        }, 10000);
      }
    }
  };

  // 매수 모달 열기
  const openBuyModal = (stock: FilteredStock) => {
    setSelectedStock(stock);
    const buyPrice = stock.currentPrice;
    const sellPrice = Math.round(buyPrice * 1.01); // 1% 상승가격으로 기본 설정

    setBuySettings({
      orderType: 'market',
      price: buyPrice,
      quantity: 1,
      sellEnabled: true,
      sellProfitPercent: 1,
      sellPrice: sellPrice,
    });
    setBuyModalOpen(true);
  };

  // 매수 주문 실행
  const executeBuy = async () => {
    if (!selectedStock) return;

    try {
      const response = await fetch('/api/stock-buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          quantity: buySettings.quantity,
          price: buySettings.price,
          orderType: buySettings.orderType,
          // 매도 주문 설정
          sellEnabled: buySettings.sellEnabled,
          sellPrice: buySettings.sellPrice,
          sellProfitPercent: buySettings.sellProfitPercent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        let message = `매수 주문이 완료되었습니다.\n매수 주문번호: ${data.buyOrderNumber}`;
        if (buySettings.sellEnabled && data.sellOrderNumber) {
          message += `\n매도 주문번호: ${data.sellOrderNumber}`;
          message += `\n매도가격: ₩${buySettings.sellPrice.toLocaleString()}`;
        }
        alert(message);
        setBuyModalOpen(false);
      } else {
        alert(`주문 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('매수 주문 실패:', error);
      alert('매수 주문 중 오류가 발생했습니다.');
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* 설정 패널 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">📈 시초가 갭 & 돌파(Gap & Breakout) 전략 설정</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 시장 구분 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">시장 구분</label>
            <select
              value={settings.market}
              onChange={(e) => setSettings(prev => ({ ...prev, market: e.target.value as 'KOSPI' | 'KOSDAQ' }))}
              disabled={isAnalyzing}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white disabled:opacity-50"
            >
              <option value="KOSPI">KOSPI</option>
              <option value="KOSDAQ">KOSDAQ</option>
            </select>
          </div>

          {/* 분석 종목 개수 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">분석 종목 개수</label>
            <input
              type="number"
              value={settings.stockCount}
              onChange={(e) => setSettings(prev => ({ ...prev, stockCount: parseInt(e.target.value) || 20 }))}
              disabled={isAnalyzing}
              min="10"
              max="100"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white disabled:opacity-50"
            />
          </div>

          {/* 시가 상승 퍼센트 범위 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">시가 갭 범위 (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.gapRangeMin}
                onChange={(e) => setSettings(prev => ({ ...prev, gapRangeMin: parseFloat(e.target.value) || 0 }))}
                disabled={isAnalyzing}
                step="0.1"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm disabled:opacity-50"
                placeholder="최소"
              />
              <span className="text-gray-400 self-center">~</span>
              <input
                type="number"
                value={settings.gapRangeMax}
                onChange={(e) => setSettings(prev => ({ ...prev, gapRangeMax: parseFloat(e.target.value) || 0 }))}
                disabled={isAnalyzing}
                step="0.1"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm disabled:opacity-50"
                placeholder="최대"
              />
            </div>
          </div>

          {/* 최소 거래량 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">최소 거래량 (주)</label>
            <input
              type="number"
              value={settings.minVolume}
              onChange={(e) => setSettings(prev => ({ ...prev, minVolume: parseInt(e.target.value) || 0 }))}
              disabled={isAnalyzing}
              step="1000"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white disabled:opacity-50"
            />
          </div>
        </div>

        {/* 분석 시작/중지 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAnalysis}
              disabled={initialLoading}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isAnalyzing
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {initialLoading ? '초기화 중...' : isAnalyzing ? '분석 중지' : '분석 시작'}
            </button>

            <div className={`flex items-center gap-2 ${isAnalyzing ? 'text-green-400' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${isAnalyzing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-sm">
                {isAnalyzing ? (
                  <>
                    ON - 다음 실시간 데이터: <span className="font-mono font-bold text-yellow-400">{countdown}초</span>
                  </>
                ) : 'OFF'}
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            필터링된 종목: <span className="text-white font-semibold">{filteredStocks.length}</span>개
          </div>
        </div>

        {/* 카운트다운 프로그레스 바 */}
        {/* {isAnalyzing && countdown > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>실시간 데이터 업데이트</span>
              <span>{countdown}초 후 새로운 데이터 조회</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((10 - countdown) / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        )} */}
      </div>

      {/* 분석 결과 테이블 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🎯 분석 결과</h3>
          {isAnalyzing && (
            <div className="text-sm text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-700">
              📈 갭업 + 돌파 + 저가하락 종목만 표시
            </div>
          )}
        </div>

        {initialLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-gray-400">등락률 상위 종목을 조회하고 있습니다...</div>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {isAnalyzing ? '조건에 맞는 종목이 없습니다' : '분석을 시작해주세요'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3">종목명</th>
                  <th className="text-right py-3">시가(OpenPrice)</th>
                  <th className="text-right py-3">저가(LowPrice)</th>
                  <th className="text-right py-3">현재가(CurrentPrice)</th>
                  <th className="text-right py-3">전일종가(PrevPrive)</th>
                  <th className="text-right py-3">등락률</th>
                  <th className="text-right py-3">시가 갭</th>
                  <th className="text-center py-3">돌파 상태</th>
                  <th className="text-center py-3">저가 상태</th>
                  <th className="text-right py-3">거래량</th>
                  <th className="text-center py-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => (
                  <tr key={stock.symbol} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3">
                      <div>
                        <div className="font-medium">{stock.name}</div>
                        <div className="text-xs text-gray-400">{stock.symbol}</div>
                      </div>
                    </td>
                    <td className="text-right py-3">
                      ₩{stock.openPrice.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 ${stock.hasLowBelowOpen ? 'text-yellow-400' : 'text-gray-400'}`}>
                      ₩{stock.lowPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3">
                      ₩{stock.currentPrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3">
                      ₩{stock.prevClose.toLocaleString()}
                    </td>
                    <td className={`text-right py-3 ${stock.changeRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {stock.changeRate >= 0 ? '+' : ''}{stock.changeRate.toFixed(2)}%
                    </td>
                    <td className={`text-right py-3 ${stock.meetsGapCondition ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.gapPercent >= 0 ? '+' : ''}{stock.gapPercent.toFixed(2)}%
                    </td>
                    <td className={`text-center py-3 ${stock.isBreakingOut ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.isBreakingOut ? '✅ 돌파' : '❌ 미돌파'}
                    </td>
                    <td className={`text-center py-3 ${stock.hasLowBelowOpen ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.hasLowBelowOpen ? '✅ 저가 하락' : '❌ 저가 유지'}
                    </td>
                    <td className={`text-right py-3 ${stock.meetsVolumeCondition ? 'text-green-400' : 'text-red-400'}`}>
                      {(stock.volume / 1000).toFixed(0)}K
                    </td>
                    <td className="text-center py-3">
                      <button
                        onClick={() => openBuyModal(stock)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                      >
                        매수 시작
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 매수 모달 */}
      {buyModalOpen && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">💰 매수 주문</h3>
                <button
                  onClick={() => setBuyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 종목 정보 */}
              <div className="bg-gray-700 rounded p-4">
                <div className="font-semibold">{selectedStock.name}</div>
                <div className="text-sm text-gray-400">{selectedStock.symbol}</div>
                <div className="text-lg font-bold mt-2">
                  현재가: ₩{selectedStock.currentPrice.toLocaleString()}
                </div>
              </div>

              {/* 주문 타입 */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">주문 타입</label>
                <select
                  value={buySettings.orderType}
                  onChange={(e) => setBuySettings(prev => ({ ...prev, orderType: e.target.value as 'market' | 'limit' }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="market">시장가</option>
                  <option value="limit">지정가</option>
                </select>
              </div>

              {/* 매수가 */}
              {buySettings.orderType === 'limit' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">매수가</label>
                  <input
                    type="number"
                    value={buySettings.price}
                    onChange={(e) => setBuySettings(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              )}

              {/* 매수량 */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">매수량 (주)</label>
                <input
                  type="number"
                  value={buySettings.quantity}
                  onChange={(e) => setBuySettings(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>

              {/* 매도 설정 */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-400">자동 매도 주문</label>
                  <button
                    onClick={() => setBuySettings(prev => ({ ...prev, sellEnabled: !prev.sellEnabled }))}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      buySettings.sellEnabled
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {buySettings.sellEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {buySettings.sellEnabled && (
                  <div className="space-y-3">
                    {/* 수익률 설정 */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">목표 수익률 (%)</label>
                      <input
                        type="number"
                        value={buySettings.sellProfitPercent}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 1;
                          const buyPrice = buySettings.orderType === 'market' ? selectedStock.currentPrice : buySettings.price;
                          const sellPrice = Math.round(buyPrice * (1 + percent / 100));
                          setBuySettings(prev => ({
                            ...prev,
                            sellProfitPercent: percent,
                            sellPrice: sellPrice
                          }));
                        }}
                        step="0.1"
                        min="0.1"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    {/* 매도가 */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">매도가</label>
                      <input
                        type="number"
                        value={buySettings.sellPrice}
                        onChange={(e) => setBuySettings(prev => ({ ...prev, sellPrice: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    {/* 예상 수익 */}
                    <div className="bg-green-900/20 border border-green-700 rounded p-3">
                      <div className="text-sm text-green-400">예상 수익</div>
                      <div className="text-lg font-bold text-green-400">
                        ₩{((buySettings.sellPrice - (buySettings.orderType === 'market' ? selectedStock.currentPrice : buySettings.price)) * buySettings.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 예상 금액 */}
              <div className="bg-gray-700 rounded p-3">
                <div className="text-sm text-gray-400">예상 주문 금액</div>
                <div className="text-lg font-bold">
                  ₩{((buySettings.orderType === 'market' ? selectedStock.currentPrice : buySettings.price) * buySettings.quantity).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setBuyModalOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeBuy}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                {buySettings.sellEnabled ? '매수+매도 주문' : '매수 주문'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}