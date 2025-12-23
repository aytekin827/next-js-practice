'use client';

import { useState, useEffect, useCallback } from 'react';

interface QuantStock {
  종목명: string;
  종목코드: string;
  종가: number;
  시가총액: number;
  거래량: number;
  거래대금: number;
  상장주식수: number;
  시장: string;
  BPS: number;
  PER: number;
  PBR: number;
  EPS: number;
  DIV: number;
  DPS: number;
  mom_3m: number;
  mom_12m: number;
  value_score: number;
  quality_score: number;
  momentum_score: number;
  risk_score: number;
  total_score: number;
  시총구간: string;
  리스크구간: string;
  스타일: string;
  // 추가 메타데이터
  strategy_number?: string;
  strategy_name?: string;
  ref_date?: string;
}

interface FilterSettings {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ';
  minTotalScore: number;
  maxTotalScore: number;
  minValueScore: number;
  minQualityScore: number;
  minMomentumScore: number;
  maxRiskScore: number;
  marketCapCategory: 'ALL' | '초대형주(10조↑)' | '대형주(5~10조)' | '중형주(1~5조)' | '소형주(1조↓)';
  style: 'ALL' | '가치주' | '퀄리티/배당주' | '모멘텀주' | '밸류/균형형' | '모멘텀/균형형' | '퀄리티/균형형';
  minPER: number;
  maxPER: number;
  minDividend: number;
  minMom12m: number;
  maxMom12m: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface Strategy {
  strategy_number: string;
  strategy_name: string;
}

export default function QuantRecommendation() {
  const [stocks, setStocks] = useState<QuantStock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<QuantStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState('');

  // 전략 관련 상태
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // 필터링 설정 - 모든 종목이 표시되도록 넓은 범위로 설정
  const [filters, setFilters] = useState<FilterSettings>({
    market: 'ALL',
    minTotalScore: 0,
    maxTotalScore: 1000,  // 더 큰 값으로 설정
    minValueScore: 0,
    minQualityScore: 0,
    minMomentumScore: 0,
    maxRiskScore: 1000,   // 더 큰 값으로 설정
    marketCapCategory: 'ALL',
    style: 'ALL',
    minPER: 0,
    maxPER: 10000,        // 더 큰 값으로 설정
    minDividend: 0,
    minMom12m: -1000,     // 더 작은 값으로 설정
    maxMom12m: 1000,      // 더 큰 값으로 설정
    priceRange: {
      min: 0,
      max: 10000000       // 더 큰 값으로 설정 (1천만원)
    }
  });

  const [showFilters, setShowFilters] = useState(false);

  // 필터링 적용 함수
  const applyFilters = useCallback((stockList: QuantStock[]) => {
    return stockList.filter(stock => {
      // 시장 필터
      if (filters.market !== 'ALL' && stock.시장 !== filters.market) return false;

      // 종합점수 범위
      if (stock.total_score < filters.minTotalScore || stock.total_score > filters.maxTotalScore) return false;

      // 팩터 점수 필터
      if (stock.value_score < filters.minValueScore) return false;
      if (stock.quality_score < filters.minQualityScore) return false;
      if (stock.momentum_score < filters.minMomentumScore) return false;
      if (stock.risk_score > filters.maxRiskScore) return false;

      // 시총구간 필터
      if (filters.marketCapCategory !== 'ALL' && stock.시총구간 !== filters.marketCapCategory) return false;

      // 스타일 필터
      if (filters.style !== 'ALL' && stock.스타일 !== filters.style) return false;

      // PER 범위
      if (stock.PER < filters.minPER || stock.PER > filters.maxPER) return false;

      // 배당률 최소값
      if (stock.DIV < filters.minDividend) return false;

      // 12개월 모멘텀 범위
      if (stock.mom_12m < filters.minMom12m || stock.mom_12m > filters.maxMom12m) return false;

      // 주가 범위
      if (stock.종가 < filters.priceRange.min || stock.종가 > filters.priceRange.max) return false;

      return true;
    });
  }, [filters]);

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      market: 'ALL',
      minTotalScore: 0,
      maxTotalScore: 1000,  // 더 큰 값으로 설정
      minValueScore: 0,
      minQualityScore: 0,
      minMomentumScore: 0,
      maxRiskScore: 1000,   // 더 큰 값으로 설정
      marketCapCategory: 'ALL',
      style: 'ALL',
      minPER: 0,
      maxPER: 10000,        // 더 큰 값으로 설정
      minDividend: 0,
      minMom12m: -1000,     // 더 작은 값으로 설정
      maxMom12m: 1000,      // 더 큰 값으로 설정
      priceRange: {
        min: 0,
        max: 10000000       // 더 큰 값으로 설정 (1천만원)
      }
    });
  };

  // 전략 목록 로드
  const loadStrategies = async (date?: string) => {
    try {
      const response = await fetch('/api/stock-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getStrategies',
          date: date || selectedDate
        })
      });

      const data = await response.json();
      if (data.success) {
        setStrategies(data.strategies);
        // 전략이 선택되지 않았고 전략 목록이 있으면 첫 번째 전략을 자동 선택
        if (!selectedStrategy && data.strategies.length > 0) {
          setSelectedStrategy(data.strategies[0].strategy_number);
        }
      } else {
        console.error('전략 목록 로드 실패:', data.error);
      }
    } catch (error) {
      console.error('전략 목록 로드 실패:', error);
    }
  };

  // 종목 데이터 로드
  const loadStockData = async (strategy?: string, date?: string) => {
    setIsLoading(true);
    setLoadMessage('');

    try {
      const params = new URLSearchParams();
      if (strategy) {
        params.append('strategy', strategy);
      }
      if (date) {
        params.append('date', date);
      }

      const response = await fetch(`/api/stock-rankings?${params}`);
      const data = await response.json();

      if (data.success) {
        setStocks(data.data);
        setLoadMessage(`✅ ${data.count}개 종목 데이터를 불러왔습니다 (${data.date})`);

        // 데이터 로드 시 필터 자동 조정 제거 - 모든 종목이 표시되도록 함
        // 사용자가 수동으로 필터를 조정할 수 있도록 기본값 유지
      } else {
        setLoadMessage(`❌ ${data.error}`);
        setStocks([]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setLoadMessage('❌ 데이터 로드 중 오류가 발생했습니다.');
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    const initializeData = async () => {
      await loadStrategies();
      // 초기 로드 시에는 1번 전략 로드
      await loadStockData('1', selectedDate);
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 전략이나 날짜 변경 시 데이터 다시 로드
  useEffect(() => {
    if (selectedDate) {
      // 전략이 선택되지 않았으면 1번 전략 로드
      const strategyToLoad = selectedStrategy || '1';
      loadStockData(strategyToLoad, selectedDate);
    }
  }, [selectedStrategy, selectedDate]);

  // 필터링 적용 (stocks나 filters가 변경될 때마다)
  useEffect(() => {
    const filtered = applyFilters(stocks);
    setFilteredStocks(filtered);
  }, [stocks, filters, applyFilters]);

  // 매수 모달 상태
  const [selectedStock, setSelectedStock] = useState<QuantStock | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buySettings, setBuySettings] = useState({
    orderType: 'market' as 'market' | 'limit',
    price: 0,
    quantity: 1,
    // 매도 설정
    sellEnabled: true,
    sellProfitPercent: 1,
    sellPrice: 0,
    // 손절매 설정
    stopLossEnabled: true,
    stopLossPercent: 3,
    stopLossPrice: 0,
  });

  // 일괄매수 상태
  const [bulkBuyModalOpen, setBulkBuyModalOpen] = useState(false);
  const [bulkBuySettings, setBulkBuySettings] = useState<{
    [symbol: string]: {
      selected: boolean;
      price: number;
      quantity: number;
      sellEnabled: boolean;
      sellProfitPercent: number;
      sellPrice: number;
      stopLossEnabled: boolean;
      stopLossPercent: number;
      stopLossPrice: number;
    };
  }>({});



  // 할인된 가격을 계산하는 함수 (할인율을 매개변수로 받음)
  const calculateDiscountedPrice = (price: number, discountPercent: number = 1) => {
    const discounted = price * (1 - discountPercent / 100);
    return Math.round(discounted / 10) * 10;
  };

  // 매수 모달 열기
  const openBuyModal = async (stock: QuantStock) => {
    setSelectedStock(stock);

    // 현재가 조회
    let currentPrice = stock.종가; // 기본값으로 종가 사용
    let defaultDiscountPercent = 1; // 기본 할인율

    try {
      // 현재가 조회 API 호출
      const priceResponse = await fetch(`/api/stock-data?symbol=${stock.종목코드}`);
      const priceData = await priceResponse.json();

      if (priceResponse.ok && priceData.currentPrice) {
        currentPrice = priceData.currentPrice;
        console.log(`${stock.종목명}(${stock.종목코드}) - 현재가: ${currentPrice}, 종가: ${stock.종가}`);
      } else {
        console.warn(`${stock.종목명}(${stock.종목코드}) 현재가 조회 실패, 종가 사용: ${stock.종가}`);
      }
    } catch (error) {
      console.error(`${stock.종목명}(${stock.종목코드}) 현재가 조회 오류:`, error);
      // 오류 시 종가 사용
    }

    // DB에서 기본 설정값 가져오기
    let defaultProfitPercent = 1;
    let defaultStopLossPercent = 3;
    let defaultStopLossEnabled = true;

    try {
      const response = await fetch('/api/trading-settings');
      const data = await response.json();
      if (response.ok) {
        defaultProfitPercent = data.quantumDefaultProfitPercent || data.defaultProfitPercent || 1;
        defaultStopLossPercent = data.quantumDefaultStopLossPercent || data.defaultStopLossPercent || 3;
        defaultStopLossEnabled = data.quantumDefaultStopLossEnabled !== undefined ? data.quantumDefaultStopLossEnabled : (data.defaultStopLossEnabled !== undefined ? data.defaultStopLossEnabled : true);
        defaultDiscountPercent = data.quantumDefaultDiscountPercent || data.defaultDiscountPercent || 1;
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }

    // 현재가에서 설정된 할인율만큼 낮춘 가격을 10원 단위로 반올림하여 기본 매수가로 설정
    const buyPrice = calculateDiscountedPrice(currentPrice, defaultDiscountPercent);
    const sellPrice = Math.round(buyPrice * (1 + defaultProfitPercent / 100));
    const stopLossPrice = Math.round(buyPrice * (1 - defaultStopLossPercent / 100));

    setBuySettings({
      orderType: 'limit', // 지정가로 변경 (할인된 가격이므로)
      price: buyPrice,
      quantity: 1,
      sellEnabled: true,
      sellProfitPercent: defaultProfitPercent,
      sellPrice: sellPrice,
      stopLossEnabled: defaultStopLossEnabled,
      stopLossPercent: defaultStopLossPercent,
      stopLossPrice: stopLossPrice,
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
          symbol: selectedStock.종목코드,
          quantity: buySettings.quantity,
          price: buySettings.price,
          orderType: buySettings.orderType,
          sellEnabled: buySettings.sellEnabled,
          sellPrice: buySettings.sellPrice,
          sellProfitPercent: buySettings.sellProfitPercent,
          stopLossEnabled: buySettings.stopLossEnabled,
          stopLossPrice: buySettings.stopLossPrice,
          stopLossPercent: buySettings.stopLossPercent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        let message = `매수 주문이 완료되었습니다.\n매수 주문번호: ${data.buyOrderNumber}`;
        if (buySettings.sellEnabled && data.sellOrderNumber) {
          message += `\n익절 주문번호: ${data.sellOrderNumber}`;
          message += `\n익절가격: ₩${buySettings.sellPrice.toLocaleString()}`;
        }
        if (buySettings.stopLossEnabled && data.stopLossOrderNumber) {
          message += `\n손절 주문번호: ${data.stopLossOrderNumber}`;
          message += `\n손절가격: ₩${buySettings.stopLossPrice.toLocaleString()}`;
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

  // 일괄매수 모달 열기
  const openBulkBuyModal = async () => {
    // DB에서 최신 설정값 가져오기
    let maxAmount = 50000;
    let defaultProfitPercent = 1;
    let defaultStopLossPercent = 3;
    let defaultStopLossEnabled = true;
    let defaultDiscountPercent = 1; // 기본 할인율

    try {
      const response = await fetch('/api/trading-settings');
      const data = await response.json();
      if (response.ok) {
        maxAmount = data.quantumMaxAmountPerStock || data.maxAmountPerStock || 50000;
        defaultProfitPercent = data.quantumDefaultProfitPercent || data.defaultProfitPercent || 1;
        defaultStopLossPercent = data.quantumDefaultStopLossPercent || data.defaultStopLossPercent || 3;
        defaultStopLossEnabled = data.quantumDefaultStopLossEnabled !== undefined ? data.quantumDefaultStopLossEnabled : (data.defaultStopLossEnabled !== undefined ? data.defaultStopLossEnabled : true);
        defaultDiscountPercent = data.quantumDefaultDiscountPercent || data.defaultDiscountPercent || 1;
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }

    const initialSettings: typeof bulkBuySettings = {};

    // 각 종목의 현재가를 가져와서 할인된 매수가 계산
    for (const stock of filteredStocks) {
      let currentPrice = stock.종가; // 기본값으로 종가 사용

      try {
        // 현재가 조회 API 호출
        const priceResponse = await fetch(`/api/stock-data?symbol=${stock.종목코드}`);
        const priceData = await priceResponse.json();

        if (priceResponse.ok && priceData.currentPrice) {
          currentPrice = priceData.currentPrice;
          console.log(`${stock.종목명}(${stock.종목코드}) - 현재가: ${currentPrice}, 종가: ${stock.종가}`);
        } else {
          console.warn(`${stock.종목명}(${stock.종목코드}) 현재가 조회 실패, 종가 사용: ${stock.종가}`);
        }
      } catch (error) {
        console.error(`${stock.종목명}(${stock.종목코드}) 현재가 조회 오류:`, error);
        // 오류 시 종가 사용
      }

      // 현재가에서 설정된 할인율만큼 낮춘 가격을 10원 단위로 반올림하여 기본값으로
      const buyPrice = calculateDiscountedPrice(currentPrice, defaultDiscountPercent);
      const defaultQuantity = buyPrice >= maxAmount ? 1 : Math.floor(maxAmount / buyPrice);
      const sellPrice = Math.round(buyPrice * (1 + defaultProfitPercent / 100));
      const stopLossPrice = Math.round(buyPrice * (1 - defaultStopLossPercent / 100));

      initialSettings[stock.종목코드] = {
        selected: true,
        price: buyPrice,
        quantity: defaultQuantity,
        sellEnabled: true,
        sellProfitPercent: defaultProfitPercent,
        sellPrice: sellPrice,
        stopLossEnabled: defaultStopLossEnabled,
        stopLossPercent: defaultStopLossPercent,
        stopLossPrice: stopLossPrice,
      };
    }

    setBulkBuySettings(initialSettings);
    setBulkBuyModalOpen(true);
  };

  // 일괄매수 실행
  const executeBulkBuy = async () => {
    const selectedStocks = Object.entries(bulkBuySettings).filter(([, settings]) => settings.selected);

    if (selectedStocks.length === 0) {
      alert('매수할 종목을 선택해주세요.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const results: string[] = [];

    for (const [symbol, settings] of selectedStocks) {
      const stock = filteredStocks.find(s => s.종목코드 === symbol);
      if (!stock) continue;

      try {
        const response = await fetch('/api/stock-buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: symbol,
            quantity: settings.quantity,
            price: settings.price,
            orderType: 'limit',
            sellEnabled: settings.sellEnabled,
            sellPrice: settings.sellPrice,
            sellProfitPercent: settings.sellProfitPercent,
            stopLossEnabled: settings.stopLossEnabled,
            stopLossPrice: settings.stopLossPrice,
            stopLossPercent: settings.stopLossPercent,
          }),
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
          let resultMessage = `✅ ${stock.종목명}: 매수 성공`;
          if (settings.sellEnabled && settings.stopLossEnabled) {
            if (data.sellOrderSuccess && data.stopLossOrderSuccess) {
              resultMessage += ' (익절+손절 설정 완료)';
            } else if (data.sellOrderSuccess || data.stopLossOrderSuccess) {
              resultMessage += ' (일부 매도 주문 실패)';
            } else {
              resultMessage += ' (매도 주문 실패)';
            }
          } else if (settings.sellEnabled) {
            resultMessage += data.sellOrderSuccess ? ' (익절 설정 완료)' : ' (익절 주문 실패)';
          } else if (settings.stopLossEnabled) {
            resultMessage += data.stopLossOrderSuccess ? ' (손절 설정 완료)' : ' (손절 주문 실패)';
          }
          results.push(resultMessage);
        } else {
          failCount++;
          results.push(`❌ ${stock.종목명}: ${data.error}`);
        }
      } catch (error) {
        console.error('매수 주문 실패:', error);
        failCount++;
        results.push(`❌ ${stock.종목명}: 주문 실패`);
      }

      // API 부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const message = `일괄매수 완료\n성공: ${successCount}건, 실패: ${failCount}건\n\n${results.join('\n')}`;
    alert(message);
    setBulkBuyModalOpen(false);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (buyModalOpen) {
          setBuyModalOpen(false);
        }
        if (bulkBuyModalOpen) {
          setBulkBuyModalOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [buyModalOpen, bulkBuyModalOpen]);

  return (
    <div className="p-6 space-y-6">
      {/* 전략 선택 섹션 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">🚀 퀀트종목추천 전략 선택</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 날짜 선택 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">분석 날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  loadStrategies(e.target.value);
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
            </div>

            {/* 전략 선택 */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">투자 전략</label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                disabled={isLoading}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white disabled:opacity-50"
              >
                {strategies.map((strategy) => (
                  <option key={strategy.strategy_number} value={strategy.strategy_number}>
                    {strategy.strategy_name} ({strategy.strategy_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 새로고침 버튼 */}
          <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                await loadStrategies(selectedDate);
                const strategyToLoad = selectedStrategy || undefined;
                await loadStockData(strategyToLoad, selectedDate);
              }}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  데이터 로딩 중...
                </>
              ) : (
                <>
                  🔄 데이터 새로고침
                </>
              )}
            </button>

            <div className="text-sm text-gray-400">
              {strategies.length > 0 && `${strategies.length}개 전략 사용 가능`}
            </div>
          </div>

          {loadMessage && (
            <div className={`p-3 rounded ${
              loadMessage.startsWith('✅')
                ? 'bg-green-900/20 border border-green-700 text-green-400'
                : 'bg-red-900/20 border border-red-700 text-red-400'
            }`}>
              {loadMessage}
            </div>
          )}

          <div className="text-sm text-gray-400">
            <p>• 데이터는 Supabase stock_rankings 테이블에서 가져옵니다</p>
            <p>• 선택한 날짜와 전략에 따라 추천 종목이 표시됩니다</p>
            <p>• 전략을 변경하면 자동으로 데이터가 업데이트됩니다</p>
          </div>
        </div>
      </div>

      {/* 필터링 섹션 */}
      {stocks.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">🔍 종목 필터링</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {showFilters ? '필터 숨기기' : '필터 보기'}
              </button>
              <button
                onClick={resetFilters}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                필터 초기화
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-6">
              {/* 기본 필터 */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* 시장 구분 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">시장</label>
                  <select
                    value={filters.market}
                    onChange={(e) => setFilters(prev => ({ ...prev, market: e.target.value as FilterSettings['market'] }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="ALL">전체</option>
                    <option value="KOSPI">KOSPI</option>
                    <option value="KOSDAQ">KOSDAQ</option>
                  </select>
                </div>

                {/* 시총구간 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">시총구간</label>
                  <select
                    value={filters.marketCapCategory}
                    onChange={(e) => setFilters(prev => ({ ...prev, marketCapCategory: e.target.value as FilterSettings['marketCapCategory'] }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="ALL">전체</option>
                    <option value="초대형주(10조↑)">초대형주(10조↑)</option>
                    <option value="대형주(5~10조)">대형주(5~10조)</option>
                    <option value="중형주(1~5조)">중형주(1~5조)</option>
                    <option value="소형주(1조↓)">소형주(1조↓)</option>
                  </select>
                </div>

                {/* 스타일 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">투자 스타일</label>
                  <select
                    value={filters.style}
                    onChange={(e) => setFilters(prev => ({ ...prev, style: e.target.value as FilterSettings['style'] }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="ALL">전체</option>
                    <option value="가치주">가치주</option>
                    <option value="퀄리티/배당주">퀄리티/배당주</option>
                    <option value="모멘텀주">모멘텀주</option>
                    <option value="밸류/균형형">밸류/균형형</option>
                    <option value="모멘텀/균형형">모멘텀/균형형</option>
                    <option value="퀄리티/균형형">퀄리티/균형형</option>
                  </select>
                </div>

                {/* 최소 배당률 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">최소 배당률 (%)</label>
                  <input
                    type="number"
                    value={filters.minDividend}
                    onChange={(e) => setFilters(prev => ({ ...prev, minDividend: parseFloat(e.target.value) || 0 }))}
                    step="0.1"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {/* 점수 필터 */}
              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">팩터 점수 필터</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 종합점수 범위 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">종합점수 범위</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filters.minTotalScore}
                        onChange={(e) => setFilters(prev => ({ ...prev, minTotalScore: parseFloat(e.target.value) || 0 }))}
                        placeholder="최소"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                      <span className="text-gray-400 self-center">~</span>
                      <input
                        type="number"
                        value={filters.maxTotalScore}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxTotalScore: parseFloat(e.target.value) || 100 }))}
                        placeholder="최대"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 가치점수 최소값 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">최소 가치점수</label>
                    <input
                      type="number"
                      value={filters.minValueScore}
                      onChange={(e) => setFilters(prev => ({ ...prev, minValueScore: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>

                  {/* 퀄리티점수 최소값 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">최소 퀄리티점수</label>
                    <input
                      type="number"
                      value={filters.minQualityScore}
                      onChange={(e) => setFilters(prev => ({ ...prev, minQualityScore: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>

                  {/* 모멘텀점수 최소값 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">최소 모멘텀점수</label>
                    <input
                      type="number"
                      value={filters.minMomentumScore}
                      onChange={(e) => setFilters(prev => ({ ...prev, minMomentumScore: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>

                  {/* 리스크점수 최대값 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">최대 리스크점수</label>
                    <input
                      type="number"
                      value={filters.maxRiskScore}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxRiskScore: parseFloat(e.target.value) || 100 }))}
                      min="0"
                      max="100"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 기타 필터 */}
              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">기타 필터</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* PER 범위 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">PER 범위</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filters.minPER}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPER: parseFloat(e.target.value) || 0 }))}
                        placeholder="최소"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                      <span className="text-gray-400 self-center">~</span>
                      <input
                        type="number"
                        value={filters.maxPER}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPER: parseFloat(e.target.value) || 100 }))}
                        placeholder="최대"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 12개월 수익률 범위 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">12개월 수익률 범위 (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filters.minMom12m}
                        onChange={(e) => setFilters(prev => ({ ...prev, minMom12m: parseFloat(e.target.value) || -100 }))}
                        placeholder="최소"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                      <span className="text-gray-400 self-center">~</span>
                      <input
                        type="number"
                        value={filters.maxMom12m}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxMom12m: parseFloat(e.target.value) || 100 }))}
                        placeholder="최대"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 주가 범위 */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">주가 범위 (원)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={filters.priceRange.min}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          priceRange: { ...prev.priceRange, min: parseFloat(e.target.value) || 0 }
                        }))}
                        placeholder="최소"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                      <span className="text-gray-400 self-center">~</span>
                      <input
                        type="number"
                        value={filters.priceRange.max}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          priceRange: { ...prev.priceRange, max: parseFloat(e.target.value) || 1000000 }
                        }))}
                        placeholder="최대"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 필터 적용 결과 */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    필터 적용 결과: 전체 {stocks.length}개 중 <span className="text-white font-semibold">{filteredStocks.length}개</span> 종목 표시
                  </div>
                  <div className="text-xs text-gray-500">
                    필터링률: {stocks.length > 0 ? ((filteredStocks.length / stocks.length) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                {/* 필터링으로 인한 종목 누락 경고 */}
                {stocks.length > 0 && filteredStocks.length < stocks.length && (
                  <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-400">
                    ⚠️ {stocks.length - filteredStocks.length}개 종목이 필터 조건으로 인해 숨겨졌습니다.
                    모든 종목을 보려면 &quot;필터 초기화&quot; 버튼을 클릭하세요.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 종목 데이터 테이블 */}
      {stocks.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">📊 퀀트 종목 추천 리스트</h3>
              {stocks.length > 0 && stocks[0].strategy_name && (
                <div className="text-sm text-gray-400 mt-1">
                  전략: {stocks[0].strategy_name} | 날짜: {selectedDate}
                </div>
              )}
            </div>
            <div className="text-sm text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-700">
              {filteredStocks.length > 0 ? (
                <>표시 중: {filteredStocks.length}개 / 전체: {stocks.length}개</>
              ) : (
                <>총 {stocks.length}개 종목 (total_score 기준 정렬)</>
              )}
            </div>
          </div>

          {filteredStocks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {stocks.length === 0 ? '데이터를 업로드해주세요' : '필터 조건에 맞는 종목이 없습니다'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3">순위</th>
                    <th className="text-left py-3">종목명</th>
                    <th className="text-center py-3">시장</th>
                    <th className="text-center py-3">시총구간</th>
                    <th className="text-center py-3">스타일</th>
                    <th className="text-right py-3">종가</th>
                    <th className="text-right py-3">PER</th>
                    <th className="text-right py-3">PBR</th>
                    <th className="text-right py-3">배당률</th>
                    <th className="text-right py-3">3M수익률</th>
                    <th className="text-right py-3">12M수익률</th>
                    <th className="text-right py-3">가치점수</th>
                    <th className="text-right py-3">퀄리티점수</th>
                    <th className="text-right py-3">모멘텀점수</th>
                    <th className="text-right py-3">리스크점수</th>
                    <th className="text-right py-3">종합점수</th>
                    <th className="text-center py-3">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock, index) => (
                  <tr key={stock.종목코드} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 font-bold text-blue-400">
                      #{index + 1}
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="font-medium">{stock.종목명}</div>
                        <div className="text-xs text-gray-400">{stock.종목코드}</div>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stock.시장 === 'KOSPI' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                      }`}>
                        {stock.시장}
                      </span>
                    </td>
                    <td className="text-center py-3 text-xs">
                      {stock.시총구간}
                    </td>
                    <td className="text-center py-3 text-xs">
                      {stock.스타일}
                    </td>
                    <td className="text-right py-3">
                      ₩{stock.종가.toLocaleString()}
                    </td>
                    <td className="text-right py-3">
                      {stock.PER.toFixed(1)}
                    </td>
                    <td className="text-right py-3">
                      {stock.PBR.toFixed(2)}
                    </td>
                    <td className="text-right py-3">
                      {stock.DIV.toFixed(1)}%
                    </td>
                    <td className={`text-right py-3 ${stock.mom_3m >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {stock.mom_3m >= 0 ? '+' : ''}{stock.mom_3m.toFixed(1)}%
                    </td>
                    <td className={`text-right py-3 ${stock.mom_12m >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {stock.mom_12m >= 0 ? '+' : ''}{stock.mom_12m.toFixed(1)}%
                    </td>
                    <td className="text-right py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stock.value_score >= 70 ? 'bg-green-900/30 text-green-400' :
                        stock.value_score >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {stock.value_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stock.quality_score >= 70 ? 'bg-green-900/30 text-green-400' :
                        stock.quality_score >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {stock.quality_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stock.momentum_score >= 70 ? 'bg-green-900/30 text-green-400' :
                        stock.momentum_score >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {stock.momentum_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stock.risk_score <= 33 ? 'bg-green-900/30 text-green-400' :
                        stock.risk_score <= 66 ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {stock.risk_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <span className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 font-bold">
                        {stock.total_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <button
                        onClick={() => openBuyModal(stock)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                      >
                        매수
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 일괄매수 버튼 */}
            {filteredStocks.length > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={openBulkBuyModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  일괄매수 ({filteredStocks.length}종목)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* 매수 모달 */}
      {buyModalOpen && selectedStock && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 모달 외부 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setBuyModalOpen(false);
            }
          }}
        >
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
                <div className="font-semibold">{selectedStock.종목명}</div>
                <div className="text-sm text-gray-400">{selectedStock.종목코드}</div>
                <div className="text-lg font-bold mt-2">
                  종가: ₩{selectedStock.종가.toLocaleString()}
                </div>
                <div className="text-sm text-blue-400 mt-1">
                  종합점수: {selectedStock.total_score.toFixed(1)}점
                </div>
              </div>

              {/* 주문 타입 */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">주문 타입</label>
                <select
                  value={buySettings.orderType}
                  onChange={(e) => {
                    const newOrderType = e.target.value as 'market' | 'limit';
                    const newPrice = newOrderType === 'market' ? calculateDiscountedPrice(selectedStock.종가, 1) : selectedStock.종가;
                    const sellPrice = Math.round(newPrice * (1 + buySettings.sellProfitPercent / 100));
                    const stopLossPrice = Math.round(newPrice * (1 - buySettings.stopLossPercent / 100));

                    setBuySettings(prev => ({
                      ...prev,
                      orderType: newOrderType,
                      price: newPrice,
                      sellPrice: sellPrice,
                      stopLossPrice: stopLossPrice
                    }));
                  }}
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

              {/* 익절 설정 */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-400">자동 익절 주문</label>
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
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">목표 수익률 (%)</label>
                      <input
                        type="number"
                        value={buySettings.sellProfitPercent}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 1;
                          const buyPrice = buySettings.orderType === 'market' ? calculateDiscountedPrice(selectedStock.종가, 1) : buySettings.price;
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
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">익절가</label>
                      <input
                        type="number"
                        value={buySettings.sellPrice}
                        onChange={(e) => setBuySettings(prev => ({ ...prev, sellPrice: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 손절 설정 */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-gray-400">자동 손절 주문</label>
                  <button
                    onClick={() => setBuySettings(prev => ({ ...prev, stopLossEnabled: !prev.stopLossEnabled }))}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      buySettings.stopLossEnabled
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {buySettings.stopLossEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {buySettings.stopLossEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">손절률 (%)</label>
                      <input
                        type="number"
                        value={buySettings.stopLossPercent}
                        onChange={(e) => {
                          const percent = parseFloat(e.target.value) || 3;
                          const buyPrice = buySettings.orderType === 'market' ? calculateDiscountedPrice(selectedStock.종가, 1) : buySettings.price;
                          const stopLossPrice = Math.round(buyPrice * (1 - percent / 100));
                          setBuySettings(prev => ({
                            ...prev,
                            stopLossPercent: percent,
                            stopLossPrice: stopLossPrice
                          }));
                        }}
                        step="0.1"
                        min="0.1"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">손절가</label>
                      <input
                        type="number"
                        value={buySettings.stopLossPrice}
                        onChange={(e) => setBuySettings(prev => ({ ...prev, stopLossPrice: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 예상 금액 */}
              <div className="bg-gray-700 rounded p-3">
                <div className="text-sm text-gray-400">예상 주문 금액</div>
                <div className="text-lg font-bold">
                  ₩{((buySettings.orderType === 'market' ? calculateDiscountedPrice(selectedStock.종가, 1) : buySettings.price) * buySettings.quantity).toLocaleString()}
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
                매수 주문
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄매수 모달 */}
      {bulkBuyModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 모달 외부 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setBulkBuyModalOpen(false);
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">일괄매수 주문</h3>
                <button
                  onClick={() => setBulkBuyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">
                  총 {filteredStocks.length}개 종목 중 {Object.values(bulkBuySettings).filter(s => s.selected).length}개 선택됨
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredStocks.map((stock) => {
                  const settings = bulkBuySettings[stock.종목코드];
                  if (!settings) return null;

                  return (
                    <div key={stock.종목코드} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {/* 체크박스 */}
                        <div className="flex items-center pt-2">
                          <input
                            type="checkbox"
                            checked={settings.selected}
                            onChange={(e) => setBulkBuySettings(prev => ({
                              ...prev,
                              [stock.종목코드]: { ...prev[stock.종목코드], selected: e.target.checked }
                            }))}
                            className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded"
                          />
                        </div>

                        {/* 종목 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold">{stock.종목명}</div>
                              <div className="text-sm text-gray-400">{stock.종목코드} | 종합점수: {stock.total_score.toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">종가</div>
                              <div className="font-bold">₩{stock.종가.toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            {/* 매수가 */}
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">매수가</label>
                              <input
                                type="number"
                                value={settings.price}
                                onChange={(e) => {
                                  const price = parseInt(e.target.value) || 0;
                                  const sellPrice = Math.round(price * (1 + settings.sellProfitPercent / 100));
                                  const stopLossPrice = Math.round(price * (1 - settings.stopLossPercent / 100));
                                  setBulkBuySettings(prev => ({
                                    ...prev,
                                    [stock.종목코드]: {
                                      ...prev[stock.종목코드],
                                      price,
                                      sellPrice,
                                      stopLossPrice
                                    }
                                  }));
                                }}
                                className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                              />
                            </div>

                            {/* 매수량 */}
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">매수량</label>
                              <input
                                type="number"
                                value={settings.quantity}
                                onChange={(e) => setBulkBuySettings(prev => ({
                                  ...prev,
                                  [stock.종목코드]: { ...prev[stock.종목코드], quantity: parseInt(e.target.value) || 1 }
                                }))}
                                min="1"
                                className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                              />
                            </div>
                          </div>

                          {/* 익절/손절 설정 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* 익절 설정 */}
                            <div className="bg-green-900/20 border border-green-700 rounded p-3">
                              <div className="text-xs text-green-400 mb-2 font-semibold">💰 익절 설정</div>
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">목표수익률(%)</label>
                                  <input
                                    type="number"
                                    value={settings.sellProfitPercent}
                                    onChange={(e) => {
                                      const percent = parseFloat(e.target.value) || 1;
                                      const sellPrice = Math.round(settings.price * (1 + percent / 100));
                                      setBulkBuySettings(prev => ({
                                        ...prev,
                                        [stock.종목코드]: {
                                          ...prev[stock.종목코드],
                                          sellProfitPercent: percent,
                                          sellPrice
                                        }
                                      }));
                                    }}
                                    step="0.1"
                                    min="0.1"
                                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">익절가</label>
                                  <input
                                    type="number"
                                    value={settings.sellPrice}
                                    onChange={(e) => setBulkBuySettings(prev => ({
                                      ...prev,
                                      [stock.종목코드]: { ...prev[stock.종목코드], sellPrice: parseInt(e.target.value) || 0 }
                                    }))}
                                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 손절 설정 */}
                            <div className="bg-red-900/20 border border-red-700 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-red-400 font-semibold">🛡️ 손절 설정</div>
                                <button
                                  onClick={() => setBulkBuySettings(prev => ({
                                    ...prev,
                                    [stock.종목코드]: { ...prev[stock.종목코드], stopLossEnabled: !prev[stock.종목코드].stopLossEnabled }
                                  }))}
                                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                    settings.stopLossEnabled
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  {settings.stopLossEnabled ? 'ON' : 'OFF'}
                                </button>
                              </div>

                              {settings.stopLossEnabled && (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">손절률(%)</label>
                                    <input
                                      type="number"
                                      value={settings.stopLossPercent}
                                      onChange={(e) => {
                                        const percent = parseFloat(e.target.value) || 3;
                                        const stopLossPrice = Math.round(settings.price * (1 - percent / 100));
                                        setBulkBuySettings(prev => ({
                                          ...prev,
                                          [stock.종목코드]: {
                                            ...prev[stock.종목코드],
                                            stopLossPercent: percent,
                                            stopLossPrice
                                          }
                                        }));
                                      }}
                                      step="0.1"
                                      min="0.1"
                                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">손절가</label>
                                    <input
                                      type="number"
                                      value={settings.stopLossPrice}
                                      onChange={(e) => setBulkBuySettings(prev => ({
                                        ...prev,
                                        [stock.종목코드]: { ...prev[stock.종목코드], stopLossPrice: parseInt(e.target.value) || 0 }
                                      }))}
                                      className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 예상 금액 */}
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <div className="text-gray-400">매수 금액:</div>
                              <div className="text-white font-semibold">₩{(settings.price * settings.quantity).toLocaleString()}</div>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-green-400">예상 익절 수익:</div>
                              <div className="text-green-400 font-semibold">₩{((settings.sellPrice - settings.price) * settings.quantity).toLocaleString()}</div>
                            </div>
                            {settings.stopLossEnabled && (
                              <div className="flex justify-between">
                                <div className="text-red-400">예상 손절 손실:</div>
                                <div className="text-red-400 font-semibold">₩{((settings.price - settings.stopLossPrice) * settings.quantity).toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 전체 선택/해제 */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkBuySettings(prev => {
                      const updated = { ...prev };
                      Object.keys(updated).forEach(symbol => {
                        updated[symbol].selected = true;
                      });
                      return updated;
                    })}
                    className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={() => setBulkBuySettings(prev => {
                      const updated = { ...prev };
                      Object.keys(updated).forEach(symbol => {
                        updated[symbol].selected = false;
                      });
                      return updated;
                    })}
                    className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                  >
                    전체 해제
                  </button>
                </div>

                <div className="text-sm text-gray-400">
                  총 예상 매수 금액: ₩{Object.entries(bulkBuySettings)
                    .filter(([, settings]) => settings.selected)
                    .reduce((sum, [, settings]) => sum + (settings.price * settings.quantity), 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setBulkBuyModalOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeBulkBuy}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                일괄매수 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}