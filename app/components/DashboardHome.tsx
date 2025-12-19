'use client';

import { useState, useEffect } from 'react';

interface AssetData {
  totalAssets: number;
  totalAssetsChange: number;
  realizedPnL: number;
  buyingPower: number;
  totalReturn: number;
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
}



// 설정 상수들
const REFRESH_INTERVALS = {
  API_DATA: 30000,    // API 데이터 업데이트: 30초 (변경 가능)
} as const;

export default function DashboardHome() {

  const [assetData, setAssetData] = useState<AssetData>({
    totalAssets: 0,
    totalAssetsChange: 0,
    realizedPnL: 0,
    buyingPower: 0,
    totalReturn: 0
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(REFRESH_INTERVALS.API_DATA);

  // 거래 상세 모달 상태
  const [selectedTrade, setSelectedTrade] = useState<TradeHistory | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // 보유종목 테이블 정렬 상태
  type HoldingSortField = 'name' | 'symbol' | 'quantity' | 'currentPrice' | 'avgPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercent';
  type TradeSortField = 'name' | 'symbol' | 'type' | 'quantity' | 'price' | 'totalAmount' | 'timestamp' | 'status';
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

  // 정렬된 보유종목 데이터
  const sortedHoldings = [...holdings].sort((a, b) => {
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

  // 정렬된 거래내역 데이터
  const sortedTrades = [...tradeHistory].sort((a, b) => {
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
      const response = await fetch('/api/assets');
      const data = await response.json();

      if (data.error) {
        console.error('자산 데이터 오류:', data.error);
        setAssetData({
          totalAssets: 0,
          totalAssetsChange: 0,
          realizedPnL: 0,
          buyingPower: 0,
          totalReturn: 0
        });
      } else {
        setAssetData(data);
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

  const loadHoldings = async () => {
    try {
      const response = await fetch('/api/holdings');
      const data = await response.json();

      if (Array.isArray(data)) {
        setHoldings(data);
      } else {
        console.error('보유 종목 데이터 오류:', data.error);
        setHoldings([]);
      }
    } catch (error) {
      console.error('보유 종목 데이터 로딩 실패:', error);
      setHoldings([]);
    }
  };

  const loadTradeHistory = async () => {
    try {
      // 한국 시간 기준으로 오늘 날짜 사용
      const response = await fetch('/api/trades');
      const data = await response.json();

      if (Array.isArray(data)) {
        setTradeHistory(data);
      } else {
        console.error('거래 내역 데이터 오류:', data.error);
        setTradeHistory([]);
      }
    } catch (error) {
      console.error('거래 내역 데이터 로딩 실패:', error);
      setTradeHistory([]);
    }
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
  }, []);

  // 주기적 데이터 업데이트
  useEffect(() => {
    if (refreshInterval === 0) return;

    const dataInterval = setInterval(() => {
      loadAssetData();
      loadHoldings();
      loadTradeHistory();
    }, refreshInterval);

    return () => clearInterval(dataInterval);
  }, [refreshInterval]);

  return (
    <div className="p-6 space-y-6">
      {/* 새로고침 주기 설정 */}
      <div className="flex justify-end">
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

      {/* 자산 현황 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dataLoading ? (
          // 스켈레톤 UI
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2 w-20"></div>
                <div className="h-8 bg-gray-700 rounded mb-1 w-32"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </>
        ) : (
          // 실제 데이터
          <>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">총 자산</h3>
              <div className="text-2xl font-bold mb-1">
                ₩{assetData.totalAssets.toLocaleString()}
              </div>
              <div className={`text-sm ${assetData.totalAssetsChange >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                {assetData.totalAssetsChange >= 0 ? '+' : ''}₩{assetData.totalAssetsChange.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">실현 손익</h3>
              <div className={`text-2xl font-bold mb-1 ${
                assetData.realizedPnL > 0 ? 'text-red-400' :
                assetData.realizedPnL < 0 ? 'text-blue-400' :
                'text-white'
              }`}>
                ₩{assetData.realizedPnL.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">오늘</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">주문 가능 금액</h3>
              <div className="text-2xl font-bold mb-1">
                ₩{assetData.buyingPower.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">현금</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-sm text-gray-400 mb-2">총 수익률</h3>
              <div className={`text-2xl font-bold mb-1 ${
                assetData.totalReturn > 0 ? 'text-red-400' :
                assetData.totalReturn < 0 ? 'text-blue-400' :
                'text-white'
              }`}>
                {assetData.totalReturn > 0 ? '+' : ''}{assetData.totalReturn.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">전체</div>
            </div>
          </>
        )}
      </div>

      {/* 보유 종목 - 전체 너비 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">📊 보유 종목</h2>
          <div className="overflow-x-auto">
            {holdings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                보유 종목이 없습니다
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        종목명 <HoldingSortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('symbol')}
                    >
                      <div className="flex items-center gap-1">
                        코드 <HoldingSortIcon field="symbol" />
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
                      <td className="py-3 px-2">
                        <div className="font-semibold">{holding.name}</div>
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        {holding.symbol}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {holding.quantity.toLocaleString()}주
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
          {tradeHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              오늘 거래 내역이 없습니다
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
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
                    className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => handleTradeSort('symbol')}
                  >
                    <div className="flex items-center gap-1">
                      코드 <TradeSortIcon field="symbol" />
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
                    <td className="py-3 px-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        trade.type === 'buy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {trade.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-semibold">{trade.name}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-400">
                      {trade.symbol}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {trade.quantity.toLocaleString()}주
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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