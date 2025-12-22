'use client';

import { useState, useEffect, useCallback } from 'react';

interface AssetData {
  totalAssets: number;
  totalAssetsChange: number;
  realizedPnL: number;
  buyingPower: number;
  totalReturn: number;
}

interface CryptoAssetData {
  totalAssets: number;
  totalAssetsChange: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
}

interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  avgPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  market: 'stock' | 'crypto'; // 시장 구분 추가
}

interface TradeHistory {
  id: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  timestamp: string;
  status: 'completed' | 'partial' | 'pending';
  orderNumber: string;
  orderQuantity: number;
  remainingQuantity: number;
  orderType: string;
  orderTime: string;
  ccldTime: string;
  fee: number;
  marketType: string;
  market: 'stock' | 'crypto'; // 시장 구분 추가
}



// 설정 상수들
const REFRESH_INTERVALS = {
  API_DATA: 30000,    // API 데이터 업데이트: 30초 (변경 가능)
} as const;

export default function DashboardHome() {
  // 시장 필터 상태 추가
  const [marketFilter, setMarketFilter] = useState<'all' | 'stock' | 'crypto'>('all');

  const [assetData, setAssetData] = useState<AssetData>({
    totalAssets: 0,
    totalAssetsChange: 0,
    realizedPnL: 0,
    buyingPower: 0,
    totalReturn: 0
  });

  // 코인 자산 데이터 추가
  const [cryptoAssetData, setCryptoAssetData] = useState<CryptoAssetData>({
    totalAssets: 0,
    totalAssetsChange: 0,
    totalProfitLoss: 0,
    totalProfitLossPercent: 0
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(REFRESH_INTERVALS.API_DATA);

  // 거래 상세 모달 상태
  const [selectedTrade, setSelectedTrade] = useState<TradeHistory | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // 보유종목 테이블 정렬 상태
  type HoldingSortField = 'market' | 'name' | 'quantity' | 'currentPrice' | 'avgPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercent';
  type TradeSortField = 'market' | 'name' | 'type' | 'quantity' | 'price' | 'totalAmount' | 'timestamp' | 'status';
  type SortDirection = 'asc' | 'desc';

  const [holdingSortField, setHoldingSortField] = useState<HoldingSortField>('name');
  const [holdingSortDirection, setHoldingSortDirection] = useState<SortDirection>('asc');
  const [tradeSortField, setTradeSortField] = useState<TradeSortField>('timestamp');
  const [tradeSortDirection, setTradeSortDirection] = useState<SortDirection>('desc');

  // 보유종목 정렬 함수
  const handleHoldingSort = (field: HoldingSortField) => {
    if (holdingSortField === field) {
      setHoldingSortDirection(holdingSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setHoldingSortField(field);
      setHoldingSortDirection('asc');
    }
  };

  // 거래내역 정렬 함수
  const handleTradeSort = (field: TradeSortField) => {
    if (tradeSortField === field) {
      setTradeSortDirection(tradeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTradeSortField(field);
      setTradeSortDirection('asc');
    }
  };

  // 정렬된 보유종목 데이터 (필터링 적용)
  const filteredHoldings = holdings.filter(holding => {
    if (marketFilter === 'all') return true;
    return holding.market === marketFilter;
  });

  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    let aValue: string | number = a[holdingSortField];
    let bValue: string | number = b[holdingSortField];

    // 문자열의 경우 소문자로 변환하여 비교
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return holdingSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return holdingSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 정렬된 거래내역 데이터 (필터링 적용)
  const filteredTrades = tradeHistory.filter(trade => {
    if (marketFilter === 'all') return true;
    return trade.market === marketFilter;
  });

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let aValue: string | number = a[tradeSortField];
    let bValue: string | number = b[tradeSortField];

    // 문자열의 경우 소문자로 변환하여 비교
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return tradeSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return tradeSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 정렬 아이콘 컴포넌트
  const HoldingSortIcon = ({ field }: { field: HoldingSortField }) => {
    if (holdingSortField !== field) {
      return <span className="text-gray-500">↕️</span>;
    }
    return holdingSortDirection === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  const TradeSortIcon = ({ field }: { field: TradeSortField }) => {
    if (tradeSortField !== field) {
      return <span className="text-gray-500">↕️</span>;
    }
    return tradeSortDirection === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  // 데이터 로딩 함수들
  const loadAssetData = async () => {
    setDataLoading(true);
    try {
      // 주식 자산 데이터 로드
      const stockResponse = await fetch('/api/assets');
      const stockData = await stockResponse.json();

      if (stockData.error) {
        console.error('주식 자산 데이터 오류:', stockData.error);
        setAssetData({
          totalAssets: 0,
          totalAssetsChange: 0,
          realizedPnL: 0,
          buyingPower: 0,
          totalReturn: 0
        });
      } else {
        setAssetData(stockData);
      }

      // 코인 자산 데이터 로드
      try {
        const cryptoResponse = await fetch('/api/crypto/assets');
        const cryptoData = await cryptoResponse.json();

        if (Array.isArray(cryptoData)) {
          // 코인 자산 총합 계산
          const totalCryptoAssets = cryptoData.reduce((sum, asset) => sum + (asset.totalValue || 0), 0);
          const totalCryptoProfitLoss = cryptoData.reduce((sum, asset) => sum + (asset.profitLoss || 0), 0);
          const totalInvestment = totalCryptoAssets - totalCryptoProfitLoss;
          const totalCryptoProfitLossPercent = totalInvestment > 0 ? (totalCryptoProfitLoss / totalInvestment) * 100 : 0;

          setCryptoAssetData({
            totalAssets: totalCryptoAssets,
            totalAssetsChange: totalCryptoProfitLoss,
            totalProfitLoss: totalCryptoProfitLoss,
            totalProfitLossPercent: totalCryptoProfitLossPercent
          });
        } else {
          setCryptoAssetData({
            totalAssets: 0,
            totalAssetsChange: 0,
            totalProfitLoss: 0,
            totalProfitLossPercent: 0
          });
        }
      } catch (cryptoError) {
        console.error('코인 자산 데이터 로딩 실패:', cryptoError);
        setCryptoAssetData({
          totalAssets: 0,
          totalAssetsChange: 0,
          totalProfitLoss: 0,
          totalProfitLossPercent: 0
        });
      }
    } catch (error) {
      console.error('자산 데이터 로딩 실패:', error);
      setAssetData({
        totalAssets: 0,
        totalAssetsChange: 0,
        realizedPnL: 0,
        buyingPower: 0,
        totalReturn: 0
      });
    } finally {
      setDataLoading(false);
    }
  };

  const loadHoldings = useCallback(async () => {
    try {
      // 주식 보유 종목 로드
      const stockResponse = await fetch('/api/holdings');
      const stockData = await stockResponse.json();

      const stockHoldings = Array.isArray(stockData)
        ? stockData.map(holding => ({ ...holding, market: 'stock' as const }))
        : [];

      // 코인 보유 종목 로드
      let cryptoHoldings: Holding[] = [];
      try {
        const cryptoResponse = await fetch('/api/crypto/assets');
        const cryptoData = await cryptoResponse.json();

        if (Array.isArray(cryptoData)) {
          cryptoHoldings = cryptoData
            .filter(asset => asset.balance > 0)
            .map(asset => ({
              symbol: asset.currency,
              name: getCoinName(asset.currency),
              quantity: asset.balance,
              currentPrice: asset.currentPrice || 0,
              avgPrice: asset.avgBuyPrice,
              totalValue: asset.totalValue || 0,
              profitLoss: asset.profitLoss || 0,
              profitLossPercent: asset.profitLossPercent || 0,
              market: 'crypto' as const
            }));
        }
      } catch (cryptoError) {
        console.error('코인 보유 종목 로딩 실패:', cryptoError);
      }

      // 주식과 코인 보유 종목 합치기
      setHoldings([...stockHoldings, ...cryptoHoldings]);
    } catch (error) {
      console.error('보유 종목 데이터 로딩 실패:', error);
      setHoldings([]);
    }
  }, []);

  const loadTradeHistory = async () => {
    try {
      // 주식 거래 내역 로드
      const stockResponse = await fetch('/api/trades');
      const stockData = await stockResponse.json();

      const stockTrades = Array.isArray(stockData)
        ? stockData.map(trade => ({ ...trade, market: 'stock' as const }))
        : [];

      // 코인 거래 내역 로드
      let cryptoTrades: TradeHistory[] = [];
      try {
        const cryptoResponse = await fetch('/api/crypto/trades/recent');
        const cryptoData = await cryptoResponse.json();

        if (Array.isArray(cryptoData)) {
          cryptoTrades = cryptoData.map(trade => ({
            id: trade.id,
            symbol: trade.market,
            name: trade.market,
            type: trade.side === 'bid' ? 'buy' as const : 'sell' as const,
            quantity: trade.executedVolume || trade.volume,
            price: trade.executedPrice || trade.price,
            totalAmount: (trade.executedVolume || trade.volume) * (trade.executedPrice || trade.price),
            timestamp: trade.executedTime || trade.orderTime,
            status: trade.status === 'completed' ? 'completed' as const :
                    trade.status === 'partial' ? 'partial' as const : 'pending' as const,
            orderNumber: trade.upbitOrderId || trade.id,
            orderQuantity: trade.volume,
            remainingQuantity: trade.volume - (trade.executedVolume || 0),
            orderType: trade.orderType,
            orderTime: trade.orderTime,
            ccldTime: trade.executedTime || '',
            fee: trade.fee || 0,
            marketType: 'CRYPTO',
            market: 'crypto' as const
          }));
        }
      } catch (cryptoError) {
        console.error('코인 거래 내역 로딩 실패:', cryptoError);
      }

      // 주식과 코인 거래 내역 합치기
      setTradeHistory([...stockTrades, ...cryptoTrades]);
    } catch (error) {
      console.error('거래 내역 데이터 로딩 실패:', error);
      setTradeHistory([]);
    }
  };

  // 코인 이름 매핑 함수
  const getCoinName = (currency: string) => {
    const coinNames: Record<string, string> = {
      'BTC': '비트코인',
      'ETH': '이더리움',
      'XRP': '리플',
      'ADA': '에이다',
      'DOT': '폴카닷',
      'LINK': '체인링크',
      'LTC': '라이트코인',
      'BCH': '비트코인캐시',
      'SOL': '솔라나',
      'AVAX': '아발란체'
    };
    return coinNames[currency] || currency;
  };

  // 거래 상세 모달 열기
  const openTradeModal = (trade: TradeHistory) => {
    setSelectedTrade(trade);
    setTradeModalOpen(true);
  };

  // 거래 상세 모달 닫기
  const closeTradeModal = () => {
    setSelectedTrade(null);
    setTradeModalOpen(false);
  };

  // 시간 포맷팅 함수
  const formatTradeTime = (trade: TradeHistory) => {
    // ccldTime이 있으면 우선 사용 (HHMMSS 형식)
    if (trade.ccldTime && trade.ccldTime.length >= 6) {
      const hours = trade.ccldTime.slice(0, 2);
      const minutes = trade.ccldTime.slice(2, 4);
      const seconds = trade.ccldTime.slice(4, 6);
      return `${hours}:${minutes}:${seconds}`;
    }

    // orderTime이 있으면 사용 (HHMMSS 형식)
    if (trade.orderTime && trade.orderTime.length >= 6) {
      const hours = trade.orderTime.slice(0, 2);
      const minutes = trade.orderTime.slice(2, 4);
      const seconds = trade.orderTime.slice(4, 6);
      return `${hours}:${minutes}:${seconds}`;
    }

    // timestamp를 파싱해서 사용 (YYYYMMDD HHMMSS 형식)
    if (trade.timestamp && trade.timestamp.length >= 15) {
      const timePart = trade.timestamp.split(' ')[1];
      if (timePart && timePart.length >= 6) {
        const hours = timePart.slice(0, 2);
        const minutes = timePart.slice(2, 4);
        const seconds = timePart.slice(4, 6);
        return `${hours}:${minutes}:${seconds}`;
      }
    }

    return 'N/A';
  };





  // 초기 데이터 로딩
  useEffect(() => {
    loadAssetData();
    loadHoldings();
    loadTradeHistory();
  }, [loadHoldings]);

  // 주기적 데이터 업데이트
  useEffect(() => {
    if (refreshInterval === 0) return;

    const dataInterval = setInterval(() => {
      loadAssetData();
      loadHoldings();
      loadTradeHistory();
    }, refreshInterval);

    return () => clearInterval(dataInterval);
  }, [loadHoldings, refreshInterval]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (tradeModalOpen) {
          closeTradeModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [tradeModalOpen]);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더와 필터 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏠 통합 대시보드</h1>
          <p className="text-gray-400 mt-1">주식 & 코인 통합 포트폴리오</p>
        </div>

        <div className="flex items-center gap-4">
          {/* 시장 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">시장:</span>
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value as 'all' | 'stock' | 'crypto')}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white"
            >
              <option value="all">전체</option>
              <option value="stock">주식</option>
              <option value="crypto">코인</option>
            </select>
          </div>

          {/* 새로고침 설정 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">새로고침:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
            >
              <option value={10000}>10초</option>
              <option value={30000}>30초</option>
              <option value={60000}>1분</option>
              <option value={300000}>5분</option>
              <option value={0}>수동</option>
            </select>
            {refreshInterval === 0 && (
              <button
                onClick={() => {
                  loadAssetData();
                  loadHoldings();
                  loadTradeHistory();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded transition-colors"
                title="수동 새로고침"
              >
                🔄
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 자산 현황 카드 */}
      <div className="space-y-6">
        {dataLoading ? (
          // 스켈레톤 UI
          <>
            {/* 1행: 총 실현손익, 총 수익률 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-24"></div>
                  <div className="h-8 bg-gray-700 rounded mb-1 w-32"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>

            {/* 2행: 주식 관련 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-20"></div>
                  <div className="h-8 bg-gray-700 rounded mb-1 w-32"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>

            {/* 3행: 코인 관련 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-2 w-20"></div>
                  <div className="h-8 bg-gray-700 rounded mb-1 w-32"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // 실제 데이터
          <>
            {/* 1행: 총 실현손익, 총 수익률 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-2">총 실현손익</h3>
                <div className={`text-3xl font-bold mb-1 ${
                  (assetData.realizedPnL + cryptoAssetData.totalProfitLoss) > 0 ? 'text-red-400' :
                  (assetData.realizedPnL + cryptoAssetData.totalProfitLoss) < 0 ? 'text-blue-400' :
                  'text-white'
                }`}>
                  {(assetData.realizedPnL + cryptoAssetData.totalProfitLoss) > 0 ? '+' : ''}₩{(assetData.realizedPnL + cryptoAssetData.totalProfitLoss).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">주식 + 코인</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-2">총 수익률</h3>
                <div className={`text-3xl font-bold mb-1 ${
                  ((assetData.totalReturn + cryptoAssetData.totalProfitLossPercent) / 2) > 0 ? 'text-red-400' :
                  ((assetData.totalReturn + cryptoAssetData.totalProfitLossPercent) / 2) < 0 ? 'text-blue-400' :
                  'text-white'
                }`}>
                  {((assetData.totalReturn + cryptoAssetData.totalProfitLossPercent) / 2) > 0 ? '+' : ''}{((assetData.totalReturn + cryptoAssetData.totalProfitLossPercent) / 2).toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">통합 평균</div>
              </div>
            </div>

            {/* 2행: 주식 관련 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-400">📈 주식 포트폴리오</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">주식 자산</h3>
                  <div className="text-2xl font-bold mb-1">
                    ₩{assetData.totalAssets.toLocaleString()}
                  </div>
                  <div className={`text-sm ${assetData.totalAssetsChange >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {assetData.totalAssetsChange >= 0 ? '+' : ''}₩{assetData.totalAssetsChange.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">주식 주문가능금액</h3>
                  <div className="text-2xl font-bold mb-1">
                    ₩{assetData.buyingPower.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">현금</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">주식 실현손익</h3>
                  <div className={`text-2xl font-bold mb-1 ${
                    assetData.realizedPnL > 0 ? 'text-red-400' :
                    assetData.realizedPnL < 0 ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {assetData.realizedPnL > 0 ? '+' : ''}₩{assetData.realizedPnL.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">오늘</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">주식 수익률</h3>
                  <div className={`text-2xl font-bold mb-1 ${
                    assetData.totalReturn > 0 ? 'text-red-400' :
                    assetData.totalReturn < 0 ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {assetData.totalReturn > 0 ? '+' : ''}{assetData.totalReturn.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">전체</div>
                </div>
              </div>
            </div>

            {/* 3행: 코인 관련 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-orange-400">₿ 코인 포트폴리오</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">코인 평가자산</h3>
                  <div className="text-2xl font-bold mb-1">
                    ₩{cryptoAssetData.totalAssets.toLocaleString()}
                  </div>
                  <div className={`text-sm ${cryptoAssetData.totalAssetsChange >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {cryptoAssetData.totalAssetsChange >= 0 ? '+' : ''}₩{cryptoAssetData.totalAssetsChange.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">코인 주문가능금액</h3>
                  <div className="text-2xl font-bold mb-1">
                    ₩{(cryptoAssetData.totalAssets * 0.1).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">추정 (10%)</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">코인 손익</h3>
                  <div className={`text-2xl font-bold mb-1 ${
                    cryptoAssetData.totalProfitLoss > 0 ? 'text-red-400' :
                    cryptoAssetData.totalProfitLoss < 0 ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {cryptoAssetData.totalProfitLoss > 0 ? '+' : ''}₩{cryptoAssetData.totalProfitLoss.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">평가손익</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-sm text-gray-400 mb-2">코인 수익률</h3>
                  <div className={`text-2xl font-bold mb-1 ${
                    cryptoAssetData.totalProfitLossPercent > 0 ? 'text-red-400' :
                    cryptoAssetData.totalProfitLossPercent < 0 ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {cryptoAssetData.totalProfitLossPercent > 0 ? '+' : ''}{cryptoAssetData.totalProfitLossPercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">전체</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 보유 종목 - 전체 너비 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">
            📊 보유 종목
            {marketFilter !== 'all' && (
              <span className="text-sm text-gray-400 ml-2">
                ({marketFilter === 'stock' ? '주식' : '코인'})
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            {dataLoading ? (
              // 보유종목 스켈레톤 UI
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 py-3 animate-pulse">
                    {marketFilter === 'all' && (
                      <div className="w-12 h-4 bg-gray-700 rounded"></div>
                    )}
                    <div className="w-24 h-4 bg-gray-700 rounded"></div>
                    <div className="w-16 h-4 bg-gray-700 rounded"></div>
                    <div className="w-20 h-4 bg-gray-700 rounded"></div>
                    <div className="w-24 h-4 bg-gray-700 rounded"></div>
                    <div className="w-24 h-4 bg-gray-700 rounded"></div>
                    <div className="w-28 h-4 bg-gray-700 rounded"></div>
                    <div className="w-24 h-4 bg-gray-700 rounded"></div>
                    <div className="w-16 h-4 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredHoldings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {marketFilter === 'all' ? '보유 종목이 없습니다' :
                 marketFilter === 'stock' ? '보유 주식이 없습니다' : '보유 코인이 없습니다'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    {marketFilter === 'all' && (
                      <th
                        className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                        onClick={() => handleHoldingSort('market')}
                      >
                        <div className="flex items-center gap-1">
                          시장 <HoldingSortIcon field="market" />
                        </div>
                      </th>
                    )}
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        종목명 <HoldingSortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('quantity')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        수량 <HoldingSortIcon field="quantity" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('currentPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        현재가 <HoldingSortIcon field="currentPrice" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        평단가 <HoldingSortIcon field="avgPrice" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('totalValue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        평가금액 <HoldingSortIcon field="totalValue" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('profitLoss')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        평가손익 <HoldingSortIcon field="profitLoss" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('profitLossPercent')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        수익률 <HoldingSortIcon field="profitLossPercent" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((holding, index) => (
                    <tr
                      key={`${holding.symbol}-${index}`}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                    >
                      {marketFilter === 'all' && (
                        <td className="py-3 px-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            holding.market === 'stock' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                          }`}>
                            {holding.market === 'stock' ? '📈 주식' : '₿ 코인'}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-semibold">{holding.name}</div>
                          <div className="text-xs text-gray-400">{holding.symbol}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {holding.quantity.toLocaleString()}{holding.market === 'stock' ? '주' : ''}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₩{holding.currentPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        ₩{Math.round(holding.avgPrice).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₩{holding.totalValue.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-semibold ${
                        holding.profitLoss > 0 ? 'text-red-400' :
                        holding.profitLoss < 0 ? 'text-blue-400' :
                        'text-white'
                      }`}>
                        {holding.profitLoss > 0 ? '+' : ''}₩{holding.profitLoss.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-semibold ${
                        holding.profitLossPercent > 0 ? 'text-red-400' :
                        holding.profitLossPercent < 0 ? 'text-blue-400' :
                        'text-white'
                      }`}>
                        {holding.profitLossPercent > 0 ? '+' : ''}{holding.profitLossPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
      </div>

      {/* 오늘의 거래 내역 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📝 오늘의 거래 내역</h2>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ko-KR')}
          </span>
        </div>
        <div className="overflow-x-auto">
          {dataLoading ? (
            // 거래내역 스켈레톤 UI
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 py-3 animate-pulse">
                  {marketFilter === 'all' && (
                    <div className="w-12 h-4 bg-gray-700 rounded"></div>
                  )}
                  <div className="w-12 h-4 bg-gray-700 rounded"></div>
                  <div className="w-24 h-4 bg-gray-700 rounded"></div>
                  <div className="w-16 h-4 bg-gray-700 rounded"></div>
                  <div className="w-20 h-4 bg-gray-700 rounded"></div>
                  <div className="w-24 h-4 bg-gray-700 rounded"></div>
                  <div className="w-28 h-4 bg-gray-700 rounded"></div>
                  <div className="w-16 h-4 bg-gray-700 rounded"></div>
                  <div className="w-16 h-4 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : tradeHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              오늘 거래 내역이 없습니다
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  {marketFilter === 'all' && (
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleTradeSort('market')}
                    >
                      <div className="flex items-center gap-1">
                        시장 <TradeSortIcon field="market" />
                      </div>
                    </th>
                  )}
                  <th
                    className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      구분 <TradeSortIcon field="type" />
                    </div>
                  </th>
                  <th
                    className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      종목명 <TradeSortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      수량 <TradeSortIcon field="quantity" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      체결가 <TradeSortIcon field="price" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('totalAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      체결금액 <TradeSortIcon field="totalAmount" />
                    </div>
                  </th>
                  <th
                    className="text-center py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      상태 <TradeSortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="text-center py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('timestamp')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      시간 <TradeSortIcon field="timestamp" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => openTradeModal(trade)}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    {marketFilter === 'all' && (
                      <td className="py-3 px-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          trade.market === 'stock' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                        }`}>
                          {trade.market === 'stock' ? '📈 주식' : '₿ 코인'}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        trade.type === 'buy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {trade.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-semibold">{trade.name}</div>
                        <div className="text-xs text-gray-400">{trade.symbol}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {trade.quantity.toLocaleString()}{trade.market === 'stock' ? '주' : ''}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      ₩{trade.price.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">
                      ₩{trade.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trade.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        trade.status === 'partial' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {trade.status === 'completed' ? '✓ 완료' :
                         trade.status === 'partial' ? '⚡ 부분' :
                         '⏳ 대기'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      {formatTradeTime(trade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 거래 상세 모달 */}
      {tradeModalOpen && selectedTrade && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 모달 외부 클릭 시 닫기
            if (e.target === e.currentTarget) {
              closeTradeModal();
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">📋 거래 상세 정보</h3>
                <button
                  onClick={closeTradeModal}
                  className="text-gray-400 hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-md font-semibold mb-3 text-gray-200">📊 기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">종목명</div>
                    <div className="font-semibold text-lg">{selectedTrade.name}</div>
                    <div className="text-sm text-gray-400">({selectedTrade.symbol})</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">거래 구분</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold px-3 py-1 rounded ${
                        selectedTrade.type === 'buy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {selectedTrade.type === 'buy' ? '매수' : '매도'}
                      </span>
                      <span className="text-sm text-gray-300">{selectedTrade.orderType}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 체결 정보 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-md font-semibold mb-3 text-gray-200">💰 체결 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">체결 수량</div>
                    <div className="text-xl font-bold text-green-400">
                      {selectedTrade.quantity.toLocaleString()}주
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">체결 단가</div>
                    <div className="text-xl font-bold">
                      ₩{selectedTrade.price.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">체결 금액</div>
                    <div className="text-xl font-bold text-blue-400">
                      ₩{selectedTrade.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">체결 상태</div>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      selectedTrade.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      selectedTrade.status === 'partial' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {selectedTrade.status === 'completed' ? '✓ 체결완료' :
                       selectedTrade.status === 'partial' ? '⚡ 부분체결' :
                       '⏳ 대기중'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 주문 정보 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-md font-semibold mb-3 text-gray-200">📝 주문 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">주문번호</div>
                    <div className="font-mono text-sm">{selectedTrade.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">주문 수량</div>
                    <div className="font-semibold">{selectedTrade.orderQuantity.toLocaleString()}주</div>
                  </div>
                  {selectedTrade.remainingQuantity > 0 && (
                    <div>
                      <div className="text-sm text-gray-400">미체결 수량</div>
                      <div className="font-semibold text-yellow-400">
                        {selectedTrade.remainingQuantity.toLocaleString()}주
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-400">시장 구분</div>
                    <div className="font-semibold">{selectedTrade.marketType || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* 시간 정보 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-md font-semibold mb-3 text-gray-200">⏰ 시간 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">주문 시각</div>
                    <div className="font-semibold">
                      {selectedTrade.orderTime ?
                        `${selectedTrade.orderTime.slice(0,2)}:${selectedTrade.orderTime.slice(2,4)}:${selectedTrade.orderTime.slice(4,6)}` :
                        'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">체결 시각</div>
                    <div className="font-semibold">
                      {selectedTrade.ccldTime ?
                        `${selectedTrade.ccldTime.slice(0,2)}:${selectedTrade.ccldTime.slice(2,4)}:${selectedTrade.ccldTime.slice(4,6)}` :
                        'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* 수수료 정보 (있다면) */}
              {selectedTrade.fee > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-3 text-gray-200">💳 수수료 정보</h4>
                  <div>
                    <div className="text-sm text-gray-400">거래 수수료</div>
                    <div className="font-semibold text-red-400">
                      ₩{selectedTrade.fee.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700">
              <button
                onClick={closeTradeModal}
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