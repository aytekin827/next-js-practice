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
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  avgPrice: number;
  marketValue: number;
  returnRate: number;
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
  status: 'completed' | 'pending' | 'cancelled';
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const response = await fetch(`/api/trades?date=${today}`);
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
              <div className="text-2xl font-bold mb-1">
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
              <div className={`text-2xl font-bold mb-1 ${assetData.totalReturn >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                {assetData.totalReturn >= 0 ? '+' : ''}{assetData.totalReturn}%
              </div>
              <div className="text-sm text-gray-500">전체</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 보유 종목 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">📊 보유 종목</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {holdings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                보유 종목이 없습니다
              </div>
            ) : (
              holdings.map((holding) => (
                <div key={holding.id} className="bg-gray-700 rounded p-4">
                  <div className="mb-2">
                    <div className="font-semibold">{holding.name}</div>
                    <div className="text-sm text-gray-400">({holding.symbol})</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>수량: {holding.quantity}주</div>
                    <div>현재가: ₩{holding.currentPrice.toLocaleString()}</div>
                    <div>평단가: ₩{holding.avgPrice.toLocaleString()}</div>
                    <div className={holding.returnRate >= 0 ? 'text-red-400' : 'text-blue-400'}>
                      {holding.returnRate >= 0 ? '+' : ''}{holding.returnRate}%
                    </div>
                  </div>
                </div>
              ))
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
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tradeHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                오늘 거래 내역이 없습니다
              </div>
            ) : (
              tradeHistory.map((trade) => (
                <div key={trade.id} className={`rounded p-4 ${
                  trade.type === 'buy' ? 'bg-red-900/20 border border-red-900/50' : 'bg-blue-900/20 border border-blue-900/50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          trade.type === 'buy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {trade.type === 'buy' ? '매수' : '매도'}
                        </span>
                        <span className="font-semibold">{trade.name}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">({trade.symbol})</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(trade.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>수량: {trade.quantity}주</div>
                    <div>체결가: ₩{trade.price.toLocaleString()}</div>
                    <div className="col-span-2 font-semibold">
                      총액: ₩{trade.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      trade.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      trade.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {trade.status === 'completed' ? '✓ 체결완료' :
                       trade.status === 'pending' ? '⏳ 대기중' :
                       '✕ 취소됨'}
                    </span>
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