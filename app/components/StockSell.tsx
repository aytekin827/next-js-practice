'use client';

import { useState, useEffect } from 'react';

interface HoldingStock {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  originalQuantity?: number; // 원래 보유 수량
  pendingQuantity?: number; // 매도 대기 수량
}

interface PendingSellOrder {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  sellPrice: number;
  orderTime: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
  executedQuantity?: number; // 체결된 수량
  remainingQuantity?: number; // 잔여 수량
}

interface SellModalData {
  stock: HoldingStock;
  sellPrice: number;
  sellQuantity: number;
  orderType?: 'limit' | 'market';
}

interface BulkSellModalData {
  stocks: Array<{
    stock: HoldingStock;
    selected: boolean;
    sellPrice: number;
    sellQuantity: number;
    orderType: 'limit' | 'market';
  }>;
}

export default function StockSell() {
  const [holdings, setHoldings] = useState<HoldingStock[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingSellOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [bulkSellModalOpen, setBulkSellModalOpen] = useState(false);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const [sellModalData, setSellModalData] = useState<SellModalData | null>(null);
  const [bulkSellModalData, setBulkSellModalData] = useState<BulkSellModalData | null>(null);
  const [editingOrder, setEditingOrder] = useState<PendingSellOrder | null>(null);
  const [sellProfitPercent, setSellProfitPercent] = useState(3.0);

  // 보유종목 테이블 정렬 상태
  type HoldingSortField = 'name' | 'symbol' | 'quantity' | 'avgPrice' | 'currentPrice' | 'totalValue' | 'profitLoss' | 'profitLossPercent';
  type OrderSortField = 'name' | 'symbol' | 'quantity' | 'sellPrice' | 'orderTime' | 'status';
  type SortDirection = 'asc' | 'desc';

  const [holdingSortField, setHoldingSortField] = useState<HoldingSortField>('name');
  const [holdingSortDirection, setHoldingSortDirection] = useState<SortDirection>('asc');
  const [orderSortField, setOrderSortField] = useState<OrderSortField>('orderTime');
  const [orderSortDirection, setOrderSortDirection] = useState<SortDirection>('desc');

  // 보유종목 정렬 함수
  const handleHoldingSort = (field: HoldingSortField) => {
    if (holdingSortField === field) {
      setHoldingSortDirection(holdingSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setHoldingSortField(field);
      setHoldingSortDirection('asc');
    }
  };

  // 주문 정렬 함수
  const handleOrderSort = (field: OrderSortField) => {
    if (orderSortField === field) {
      setOrderSortDirection(orderSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderSortField(field);
      setOrderSortDirection('asc');
    }
  };

  // 정렬된 보유종목 데이터
  const sortedHoldings = [...holdings].sort((a, b) => {
    let aValue: string | number = a[holdingSortField];
    let bValue: string | number = b[holdingSortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return holdingSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return holdingSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 정렬된 주문 데이터
  const sortedOrders = [...pendingOrders].sort((a, b) => {
    let aValue: string | number = a[orderSortField];
    let bValue: string | number = b[orderSortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return orderSortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return orderSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 정렬 아이콘 컴포넌트
  const HoldingSortIcon = ({ field }: { field: HoldingSortField }) => {
    if (holdingSortField !== field) {
      return <span className="text-gray-500">↕️</span>;
    }
    return holdingSortDirection === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  const OrderSortIcon = ({ field }: { field: OrderSortField }) => {
    if (orderSortField !== field) {
      return <span className="text-gray-500">↕️</span>;
    }
    return orderSortDirection === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>;
  };

  // 예상 수익 계산 (매도 가능한 종목만)
  const calculateExpectedProfit = () => {
    return holdings
      .filter(stock => stock.quantity > 0) // 매도 가능한 종목만
      .reduce((total, stock) => {
        const sellPrice = Math.round(stock.avgPrice * (1 + sellProfitPercent / 100) / 10) * 10;
        const profit = (sellPrice - stock.avgPrice) * stock.quantity;
        return total + profit;
      }, 0);
  };

  const calculateExpectedProfitPercent = () => {
    const sellableHoldings = holdings.filter(stock => stock.quantity > 0);
    const totalInvestment = sellableHoldings.reduce((total, stock) => total + (stock.avgPrice * stock.quantity), 0);
    if (totalInvestment === 0) return 0;
    return (calculateExpectedProfit() / totalInvestment) * 100;
  };

  // 시간 포맷팅 함수
  const formatOrderTime = (orderTime: string) => {
    if (!orderTime || orderTime.length < 15) return 'N/A';

    try {
      // "YYYYMMDD HHMMSS" 형식을 파싱
      const datePart = orderTime.slice(0, 8); // YYYYMMDD
      const timePart = orderTime.slice(9, 15); // HHMMSS

      if (datePart.length === 8 && timePart.length >= 6) {

        const month = datePart.slice(4, 6);
        const day = datePart.slice(6, 8);
        const hour = timePart.slice(0, 2);
        const minute = timePart.slice(2, 4);

        return `${month}/${day} ${hour}:${minute}`;
      }
    } catch (error) {
      console.error('시간 파싱 오류:', error);
    }

    return 'N/A';
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 보유 종목과 매도 대기 주문을 동시에 로드
      const [holdingsResponse, ordersResponse] = await Promise.all([
        fetch('/api/holdings'),
        fetch('/api/sell-orders')
      ]);

      let holdingsData: HoldingStock[] = [];
      let ordersData: PendingSellOrder[] = [];

      if (holdingsResponse.ok) {
        holdingsData = await holdingsResponse.json();
      } else {
        console.error('보유 종목 조회 실패:', await holdingsResponse.text());
      }

      if (ordersResponse.ok) {
        ordersData = await ordersResponse.json();
      } else {
        console.error('매도 주문 조회 실패:', await ordersResponse.text());
      }

      // 오늘 날짜의 매도 대기 주문만 필터링 (pending, partial 상태)
      const todayPendingOrders = ordersData.filter(order => {
        const isToday = order.orderTime.startsWith(new Date().toISOString().split('T')[0].replace(/-/g, ''));
        const isPending = order.status === 'pending' || order.status === 'partial';
        return isToday && isPending;
      });

      // 종목별 매도 대기 수량 계산 (미체결 + 부분체결의 잔여수량)
      const pendingQuantityBySymbol = todayPendingOrders.reduce((acc, order) => {
        // 실제 미체결 수량 = 주문수량 - 체결수량
        const remainingQty = order.quantity - (order.executedQuantity || 0);
        if (remainingQty > 0) {
          acc[order.symbol] = (acc[order.symbol] || 0) + remainingQty;
        }
        return acc;
      }, {} as Record<string, number>);

      // 매도 가능한 종목 계산
      const sellableHoldings = holdingsData
        .map(stock => {
          const pendingQuantity = pendingQuantityBySymbol[stock.symbol] || 0;
          const availableQuantity = stock.quantity - pendingQuantity;

          return {
            ...stock,
            quantity: Math.max(0, availableQuantity), // 매도 가능한 수량 (음수 방지)
            originalQuantity: stock.quantity, // 원래 보유 수량 보관
            pendingQuantity: pendingQuantity // 매도 대기 수량 보관
          };
        })
        .filter(stock => stock.originalQuantity > 0); // 실제 보유 종목만 표시

      setHoldings(sellableHoldings);
      setPendingOrders(todayPendingOrders); // 오늘의 매도 대기 주문만 설정

      // 트레이딩 설정 로드
      const settingsResponse = await fetch('/api/trading-settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSellProfitPercent(settingsData.sellProfitPercent || 3.0);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 개별 매도 모달 열기
  const openSellModal = (stock: HoldingStock) => {
    const sellPrice = Math.round(stock.avgPrice * (1 + sellProfitPercent / 100) / 10) * 10;
    setSellModalData({
      stock,
      sellPrice,
      sellQuantity: stock.quantity,
      orderType: 'limit'
    });
    setSellModalOpen(true);
  };

  // 일괄 매도 모달 열기
  const openBulkSellModal = () => {
    const stocksData = holdings
      .filter(stock => stock.quantity > 0) // 매도 가능한 종목만
      .map(stock => ({
        stock,
        selected: true,
        sellPrice: Math.round(stock.avgPrice * (1 + sellProfitPercent / 100) / 10) * 10,
        sellQuantity: stock.quantity,
        orderType: 'limit' as const
      }));
    setBulkSellModalData({ stocks: stocksData });
    setBulkSellModalOpen(true);
  };

  // 매도 주문 수정 모달 열기
  const openEditOrderModal = (order: PendingSellOrder) => {
    setEditingOrder({ ...order });
    setEditOrderModalOpen(true);
  };

  // 개별 매도 실행
  const executeSell = async () => {
    if (!sellModalData) return;

    try {
      const response = await fetch('/api/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sellModalData.stock.symbol,
          quantity: sellModalData.sellQuantity,
          price: sellModalData.sellPrice,
          orderType: sellModalData.orderType || 'limit'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setSellModalOpen(false);
        setSellModalData(null);
        loadData(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`매도 주문 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('매도 주문 실패:', error);
      alert('매도 주문 중 오류가 발생했습니다.');
    }
  };

  // 일괄 매도 실행
  const executeBulkSell = async () => {
    if (!bulkSellModalData) return;

    const selectedStocks = bulkSellModalData.stocks.filter(item => item.selected);

    try {
      const response = await fetch('/api/sell/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: selectedStocks.map(item => ({
            symbol: item.stock.symbol,
            quantity: item.sellQuantity,
            price: item.sellPrice,
            orderType: item.orderType
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        if (result.failedOrders && result.failedOrders.length > 0) {
          const failedList = result.failedOrders.map((f: { symbol: string; error: string }) => `${f.symbol}: ${f.error}`).join('\n');
          alert(`실패한 주문:\n${failedList}`);
        }
        setBulkSellModalOpen(false);
        setBulkSellModalData(null);
        loadData(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`일괄 매도 주문 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('일괄 매도 주문 실패:', error);
      alert('일괄 매도 주문 중 오류가 발생했습니다.');
    }
  };

  // 매도 주문 수정
  const updateSellOrder = async () => {
    if (!editingOrder) return;

    try {
      const response = await fetch(`/api/sell-orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellPrice: editingOrder.sellPrice,
          symbol: editingOrder.symbol,
          quantity: editingOrder.quantity
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setEditOrderModalOpen(false);
        setEditingOrder(null);
        loadData(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`주문 수정 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('주문 수정 실패:', error);
      alert('주문 수정 중 오류가 발생했습니다.');
    }
  };

  // 매도 주문 취소
  const cancelOrder = async (orderId: string) => {
    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sell-orders/${orderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        loadData(); // 데이터 새로고침
      } else {
        const error = await response.json();
        alert(`주문 취소 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('주문 취소 실패:', error);
      alert('주문 취소 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <div className="text-center mt-4 text-gray-400">데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">💰 주식매도</h1>
          <p className="text-gray-400 mt-1">보유 종목 매도 및 매도 주문 관리</p>
        </div>

        {/* 예상 수익 정보 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">
            매도 가능 종목 전체 매도 시 예상 수익
            <span className="text-xs ml-2">
              ({holdings.filter(h => h.quantity > 0).length}종목)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-lg font-bold ${
              calculateExpectedProfit() > 0 ? 'text-red-400' :
              calculateExpectedProfit() < 0 ? 'text-blue-400' :
              'text-white'
            }`}>
              {calculateExpectedProfit() >= 0 ? '+' : ''}{calculateExpectedProfit().toLocaleString()}원
            </div>
            <div className={`text-sm ${
              calculateExpectedProfitPercent() > 0 ? 'text-red-400' :
              calculateExpectedProfitPercent() < 0 ? 'text-blue-400' :
              'text-white'
            }`}>
              ({calculateExpectedProfitPercent() >= 0 ? '+' : ''}{calculateExpectedProfitPercent().toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 보유 종목 테이블 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">📋 매도 가능 종목</h2>
              <p className="text-sm text-gray-400 mt-1">
                보유 중인 종목에서 매도 주문이 걸려있지 않은 수량만 표시됩니다
              </p>
            </div>
            <button
              onClick={openBulkSellModal}
              disabled={holdings.filter(h => h.quantity > 0).length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              일괄 매도 ({holdings.filter(h => h.quantity > 0).length}종목)
            </button>
          </div>

          <div className="overflow-x-auto">
            {holdings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                보유 중인 종목이 없습니다
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
                        매도가능수량 <HoldingSortIcon field="quantity" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleHoldingSort('avgPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        평균단가 <HoldingSortIcon field="avgPrice" />
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
                    <th className="text-center py-3 px-2">
                      매도
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((stock, index) => {
                    const canSell = stock.quantity > 0;
                    return (
                    <tr
                      key={`${stock.symbol}-${index}`}
                      className={`border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${
                        !canSell ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="font-semibold">{stock.name}</div>
                        {!canSell && (
                          <div className="text-xs text-yellow-400">매도 주문 대기 중</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        {stock.symbol}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className={`font-semibold ${canSell ? 'text-green-400' : 'text-gray-500'}`}>
                          {stock.quantity.toLocaleString()}주
                        </div>
                        <div className="text-xs text-gray-500">
                          전체보유: {stock.originalQuantity?.toLocaleString()}주
                          {stock.pendingQuantity && stock.pendingQuantity > 0 && (
                            <span className="text-yellow-400"> | 매도대기: {stock.pendingQuantity.toLocaleString()}주</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        ₩{Math.round(stock.avgPrice).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₩{stock.currentPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₩{stock.totalValue.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-semibold ${
                        stock.profitLoss > 0 ? 'text-red-400' :
                        stock.profitLoss < 0 ? 'text-blue-400' :
                        'text-white'
                      }`}>
                        {stock.profitLoss > 0 ? '+' : ''}₩{stock.profitLoss.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-semibold ${
                        stock.profitLossPercent > 0 ? 'text-red-400' :
                        stock.profitLossPercent < 0 ? 'text-blue-400' :
                        'text-white'
                      }`}>
                        {stock.profitLossPercent > 0 ? '+' : ''}{stock.profitLossPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => openSellModal(stock)}
                          disabled={!canSell}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs transition-colors"
                        >
                          {canSell ? '매도' : '대기중'}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 매도 대기 주문 테이블 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">⏳ 매도 대기 주문</h2>
            <p className="text-sm text-gray-400 mt-1">
              오늘 매도 주문을 넣었지만 아직 체결되지 않은 주문들입니다
            </p>
          </div>

          <div className="overflow-x-auto">
            {pendingOrders.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                매도 대기 중인 주문이 없습니다
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        종목명 <OrderSortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="text-left py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('symbol')}
                    >
                      <div className="flex items-center gap-1">
                        코드 <OrderSortIcon field="symbol" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('quantity')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        주문수량 <OrderSortIcon field="quantity" />
                      </div>
                    </th>
                    <th
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('sellPrice')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        매도가격 <OrderSortIcon field="sellPrice" />
                      </div>
                    </th>
                    <th
                      className="text-center py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        상태 <OrderSortIcon field="status" />
                      </div>
                    </th>
                    <th
                      className="text-center py-3 px-2 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => handleOrderSort('orderTime')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        주문시간 <OrderSortIcon field="orderTime" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-2">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="font-semibold">{order.name}</div>
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        {order.symbol}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="font-semibold">
                          {order.quantity.toLocaleString()}주
                        </div>
                        {order.executedQuantity && order.executedQuantity > 0 && (
                          <div className="text-xs text-gray-500">
                            체결: {order.executedQuantity.toLocaleString()}주 |
                            잔여: {(order.quantity - order.executedQuantity).toLocaleString()}주
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₩{order.sellPrice.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                          order.status === 'partial' ? 'bg-blue-900/50 text-blue-400' :
                          order.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                          'bg-red-900/50 text-red-400'
                        }`}>
                          {order.status === 'pending' ? '대기중' :
                           order.status === 'partial' ? '부분체결' :
                           order.status === 'completed' ? '완료' : '취소됨'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-xs">
                        {formatOrderTime(order.orderTime)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {(order.status === 'pending' || order.status === 'partial') && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => openEditOrderModal(order)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        )}
                        {order.status === 'completed' && (
                          <span className="text-xs text-gray-500">완료됨</span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="text-xs text-gray-500">취소됨</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 개별 매도 모달 */}
      {sellModalOpen && sellModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">매도 주문</h3>

            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">종목 정보</div>
                <div className="font-semibold">{sellModalData.stock.name} ({sellModalData.stock.symbol})</div>
                <div className="text-sm text-gray-400 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-semibold">
                      매도가능: {sellModalData.stock.quantity.toLocaleString()}주
                    </span>
                    <span>|</span>
                    <span>평균단가: ₩{Math.round(sellModalData.stock.avgPrice).toLocaleString()}</span>
                  </div>
                  {sellModalData.stock.pendingQuantity && sellModalData.stock.pendingQuantity > 0 && (
                    <div className="text-xs text-yellow-400 mt-2 p-2 bg-yellow-900/20 rounded">
                      ℹ️ 전체보유: {sellModalData.stock.originalQuantity?.toLocaleString()}주
                      (매도대기: {sellModalData.stock.pendingQuantity.toLocaleString()}주)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">주문 유형</label>
                <select
                  value={sellModalData.orderType || 'limit'}
                  onChange={(e) => setSellModalData(prev => prev ? {
                    ...prev,
                    orderType: e.target.value as 'limit' | 'market'
                  } : null)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-3"
                >
                  <option value="limit">지정가</option>
                  <option value="market">시장가</option>
                </select>

                {sellModalData.orderType !== 'market' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">매도가격 (원)</label>
                    <input
                      type="number"
                      value={sellModalData.sellPrice}
                      onChange={(e) => setSellModalData(prev => prev ? {
                        ...prev,
                        sellPrice: parseInt(e.target.value) || 0
                      } : null)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      예상 수익: {((sellModalData.sellPrice - sellModalData.stock.avgPrice) * sellModalData.sellQuantity).toLocaleString()}원
                    </div>
                  </div>
                )}

                {sellModalData.orderType === 'market' && (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
                    <div className="text-sm text-yellow-400">
                      시장가 주문은 현재 시장가격으로 즉시 체결됩니다.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  매도수량 (주)
                  <span className="text-xs text-gray-500 ml-2">
                    최대: {sellModalData.stock.quantity.toLocaleString()}주
                  </span>
                </label>
                <input
                  type="number"
                  value={sellModalData.sellQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const maxQuantity = sellModalData.stock.quantity;
                    setSellModalData(prev => prev ? {
                      ...prev,
                      sellQuantity: Math.min(value, maxQuantity)
                    } : null);
                  }}
                  min="1"
                  max={sellModalData.stock.quantity}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
                <div className="text-xs text-gray-500 mt-1">
                  예상 매도금액: ₩{(sellModalData.sellPrice * sellModalData.sellQuantity).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSellModalOpen(false);
                    setSellModalData(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={executeSell}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                >
                  매도 주문
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 매도 모달 */}
      {bulkSellModalOpen && bulkSellModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">일괄 매도 주문</h3>

            <div className="space-y-4">
              {bulkSellModalData.stocks.map((item, index) => (
                <div key={item.stock.symbol} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => setBulkSellModalData(prev => prev ? {
                        ...prev,
                        stocks: prev.stocks.map((stock, i) =>
                          i === index ? { ...stock, selected: e.target.checked } : stock
                        )
                      } : null)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{item.stock.name} ({item.stock.symbol})</div>
                      <div className="text-sm text-gray-400">
                        매도가능: {item.stock.quantity.toLocaleString()}주 |
                        평균단가: {item.stock.avgPrice.toLocaleString()}원
                        {item.stock.pendingQuantity && item.stock.pendingQuantity > 0 && (
                          <div className="text-xs text-yellow-400">
                            (전체보유: {item.stock.originalQuantity?.toLocaleString()}주, 매도대기: {item.stock.pendingQuantity.toLocaleString()}주)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.selected && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">주문 유형</label>
                        <select
                          value={item.orderType}
                          onChange={(e) => setBulkSellModalData(prev => prev ? {
                            ...prev,
                            stocks: prev.stocks.map((stock, i) =>
                              i === index ? { ...stock, orderType: e.target.value as 'limit' | 'market' } : stock
                            )
                          } : null)}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                        >
                          <option value="limit">지정가</option>
                          <option value="market">시장가</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {item.orderType === 'limit' && (
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">매도가격</label>
                            <input
                              type="number"
                              value={item.sellPrice}
                              onChange={(e) => setBulkSellModalData(prev => prev ? {
                                ...prev,
                                stocks: prev.stocks.map((stock, i) =>
                                  i === index ? { ...stock, sellPrice: parseInt(e.target.value) || 0 } : stock
                                )
                              } : null)}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                            />
                          </div>
                        )}
                        <div className={item.orderType === 'market' ? 'col-span-2' : ''}>
                          <label className="block text-sm text-gray-400 mb-1">매도수량</label>
                          <input
                            type="number"
                            value={item.sellQuantity}
                            onChange={(e) => setBulkSellModalData(prev => prev ? {
                              ...prev,
                              stocks: prev.stocks.map((stock, i) =>
                                i === index ? { ...stock, sellQuantity: parseInt(e.target.value) || 0 } : stock
                              )
                            } : null)}
                            max={item.stock.quantity}
                            className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-4 border-t border-gray-600">
                <button
                  onClick={() => {
                    setBulkSellModalOpen(false);
                    setBulkSellModalData(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={executeBulkSell}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                >
                  일괄 매도 주문
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 매도 주문 수정 모달 */}
      {editOrderModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">매도 주문 수정</h3>

            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">종목 정보</div>
                <div className="font-semibold">{editingOrder.name} ({editingOrder.symbol})</div>
                <div className="text-sm text-gray-400 mt-1">
                  주문수량: {editingOrder.quantity.toLocaleString()}주
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">매도가격 (원)</label>
                <input
                  type="number"
                  value={editingOrder.sellPrice}
                  onChange={(e) => setEditingOrder(prev => prev ? {
                    ...prev,
                    sellPrice: parseInt(e.target.value) || 0
                  } : null)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditOrderModalOpen(false);
                    setEditingOrder(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={updateSellOrder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}