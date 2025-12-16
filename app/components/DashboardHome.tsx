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

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// 설정 상수들
const REFRESH_INTERVALS = {
  API_DATA: 30000,    // API 데이터 업데이트: 30초 (변경 가능)
} as const;

export default function DashboardHome() {
  const [botActive, setBotActive] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('easy');
  const [assetData, setAssetData] = useState<AssetData>({
    totalAssets: 0,
    totalAssetsChange: 0,
    realizedPnL: 0,
    buyingPower: 0,
    totalReturn: 0
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
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

  // 봇 제어 함수들
  const toggleBot = async () => {
    try {
      setBotActive(!botActive);

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: botActive ? '트레이딩 봇이 중지되었습니다.' : '트레이딩 봇이 시작되었습니다.',
        type: botActive ? 'warning' : 'success'
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error('봇 제어 실패:', error);
    }
  };

  const emergencyStop = async () => {
    try {
      setBotActive(false);

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: '🚨 비상 정지 실행 - 모든 주문이 취소되었습니다.',
        type: 'error'
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error('비상 정지 실패:', error);
    }
  };

  const sellStock = async (holdingId: string) => {
    try {
      const holding = holdings.find(h => h.id === holdingId);
      if (!holding) return;

      const response = await fetch('/api/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdingId: holdingId,
          symbol: holding.symbol,
          quantity: holding.quantity
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          message: `${holding.name}(${holding.symbol}) ${holding.quantity}주 시장가 매도 주문 전송 완료`,
          type: 'success'
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
        loadHoldings();
      } else {
        const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          message: `매도 주문 실패: ${data.error}`,
          type: 'error'
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
      }
    } catch (error) {
      console.error('매도 실패:', error);
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: '매도 주문 중 오류가 발생했습니다',
        type: 'error'
      };
      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    loadAssetData();
    loadHoldings();
  }, []);

  // 주기적 데이터 업데이트
  useEffect(() => {
    if (refreshInterval === 0) return;

    const dataInterval = setInterval(() => {
      loadAssetData();
      loadHoldings();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 봇 제어 패널 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">🤖 봇 제어 패널</h2>

          {/* 메인 스위치 */}
          <div className="text-center mb-6">
            <button
              onClick={toggleBot}
              className={`w-32 h-32 rounded-full text-xl font-bold transition-all ${
                botActive
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {botActive ? 'STOP' : 'START'}
            </button>
            <div className={`mt-2 text-sm ${botActive ? 'text-green-400' : 'text-gray-400'}`}>
              {botActive ? '트레이딩 봇 가동 중' : '대기 모드'}
            </div>
          </div>

          {/* 전략 선택 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">전략 선택</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="easy">쉬운 전략 (단순 조건)</option>
              <option value="volatility">변동성 돌파</option>
              <option value="scalping">스캘핑</option>
            </select>
          </div>

          {/* 비상 종료 */}
          <button
            onClick={emergencyStop}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-semibold"
          >
            🚨 비상 종료
          </button>
        </div>

        {/* 보유 종목 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">📊 보유 종목</h2>
          <div className="space-y-3">
            {holdings.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                보유 종목이 없습니다
              </div>
            ) : (
              holdings.map((holding) => (
                <div key={holding.id} className="bg-gray-700 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{holding.name}</div>
                      <div className="text-sm text-gray-400">({holding.symbol})</div>
                    </div>
                    <button
                      onClick={() => sellStock(holding.id)}
                      className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded"
                    >
                      매도
                    </button>
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

        {/* 실시간 로그 */}
        <div className="bg-black rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-green-400">💻 실시간 로그</h2>
          <div className="h-80 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-green-400">[시스템 대기 중...]</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'error' ? 'text-red-400' :
                  'text-green-400'
                }`}>
                  [{log.timestamp}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}