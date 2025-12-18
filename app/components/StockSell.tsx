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
}

interface PendingSellOrder {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  sellPrice: number;
  orderTime: string;
  status: 'pending' | 'partial' | 'completed' | 'cancelled';
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

  // 예상 수익 계산
  const calculateExpectedProfit = () => {
    return holdings.reduce((total, stock) => {
      const sellPrice = Math.round(stock.avgPrice * (1 + sellProfitPercent / 100) / 10) * 10;
      const profit = (sellPrice - stock.avgPrice) * stock.quantity;
      return total + profit;
    }, 0);
  };

  const calculateExpectedProfitPercent = () => {
    const totalInvestment = holdings.reduce((total, stock) => total + (stock.avgPrice * stock.quantity), 0);
    if (totalInvestment === 0) return 0;
    return (calculateExpectedProfit() / totalInvestment) * 100;
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 보유 종목 로드
      const holdingsResponse = await fetch('/api/holdings');
      if (holdingsResponse.ok) {
        const holdingsData = await holdingsResponse.json();
        setHoldings(holdingsData);
      }

      // 매도 대기 주문 로드
      const ordersResponse = await fetch('/api/sell-orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setPendingOrders(ordersData);
      }

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
    const stocksData = holdings.map(stock => ({
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
          <div className="text-sm text-gray-400 mb-1">전체 매도 시 예상 수익</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 매도 가능한 종목 리스트 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">📋 보유 종목</h2>
            <button
              onClick={openBulkSellModal}
              disabled={holdings.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              일괄 매도
            </button>
          </div>

          <div className="space-y-3">
            {holdings.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
                <div className="text-gray-400">보유 중인 종목이 없습니다</div>
              </div>
            ) : (
              holdings.map((stock) => (
                <div key={stock.symbol} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{stock.name}</span>
                        <span className="text-sm text-gray-400">({stock.symbol})</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">보유수량</div>
                          <div className="font-medium">{stock.quantity.toLocaleString()}주</div>
                        </div>
                        <div>
                          <div className="text-gray-400">평균단가</div>
                          <div className="font-medium">{stock.avgPrice.toLocaleString()}원</div>
                        </div>
                        <div>
                          <div className="text-gray-400">현재가</div>
                          <div className="font-medium">{stock.currentPrice.toLocaleString()}원</div>
                        </div>
                        <div>
                          <div className="text-gray-400">평가손익</div>
                          <div className={`font-medium ${
                            stock.profitLoss > 0 ? 'text-red-400' : 
                            stock.profitLoss < 0 ? 'text-blue-400' : 
                            'text-white'
                          }`}>
                            {stock.profitLoss >= 0 ? '+' : ''}{stock.profitLoss.toLocaleString()}원
                            <span className="text-xs ml-1">
                              ({stock.profitLossPercent >= 0 ? '+' : ''}{stock.profitLossPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => openSellModal(stock)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors ml-4"
                    >
                      매도
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 매도 대기중인 종목들 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">⏳ 매도 대기 주문</h2>
          
          <div className="space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
                <div className="text-gray-400">매도 대기 중인 주문이 없습니다</div>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <div key={order.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{order.name}</span>
                        <span className="text-sm text-gray-400">({order.symbol})</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                          order.status === 'partial' ? 'bg-blue-900/30 text-blue-400' :
                          order.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          {order.status === 'pending' ? '대기중' :
                           order.status === 'partial' ? '부분체결' :
                           order.status === 'completed' ? '완료' : '취소됨'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">매도수량</div>
                          <div className="font-medium">{order.quantity.toLocaleString()}주</div>
                        </div>
                        <div>
                          <div className="text-gray-400">매도가격</div>
                          <div className="font-medium">{order.sellPrice.toLocaleString()}원</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-gray-400">주문시간</div>
                          <div className="font-medium text-xs">{order.orderTime}</div>
                        </div>
                      </div>
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => openEditOrderModal(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
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
                  보유수량: {sellModalData.stock.quantity.toLocaleString()}주 | 
                  평균단가: {sellModalData.stock.avgPrice.toLocaleString()}원
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
                <label className="block text-sm text-gray-400 mb-2">매도수량 (주)</label>
                <input
                  type="number"
                  value={sellModalData.sellQuantity}
                  onChange={(e) => setSellModalData(prev => prev ? {
                    ...prev,
                    sellQuantity: parseInt(e.target.value) || 0
                  } : null)}
                  max={sellModalData.stock.quantity}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
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
                        보유: {item.stock.quantity.toLocaleString()}주 | 
                        평균단가: {item.stock.avgPrice.toLocaleString()}원
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