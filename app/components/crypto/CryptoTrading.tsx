'use client';

import { useState, useEffect } from 'react';

interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  market: string;
  isActive: boolean;
  profitLoss: number;
  totalTrades: number;
  winRate: number;
  lastExecuted: string;
  parameters: Record<string, number | string>;
}

interface StrategyTrade {
  id: string;
  strategyId: string;
  strategyName: string;
  market: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  timestamp: string;
  status: 'completed' | 'failed';
  reason: string;
}

export default function CryptoTrading() {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [strategyTrades, setStrategyTrades] = useState<StrategyTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 전략 템플릿
  const strategyTemplates = [
    {
      name: 'RSI 역추세',
      description: 'RSI 지표를 활용한 역추세 매매',
      parameters: {
        rsiPeriod: 14,
        oversoldLevel: 30,
        overboughtLevel: 70,
        investmentAmount: 100000
      }
    },
    {
      name: '볼린저 밴드',
      description: '볼린저 밴드 돌파/이탈 전략',
      parameters: {
        period: 20,
        standardDeviation: 2,
        investmentAmount: 100000
      }
    },
    {
      name: '이동평균 크로스',
      description: '단기/장기 이동평균 교차 전략',
      parameters: {
        shortPeriod: 5,
        longPeriod: 20,
        investmentAmount: 100000
      }
    },
    {
      name: 'MACD 신호',
      description: 'MACD 골든/데드 크로스 전략',
      parameters: {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        investmentAmount: 100000
      }
    }
  ];

  useEffect(() => {
    loadStrategies();
    loadStrategyTrades();
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showCreateModal) {
          setShowCreateModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showCreateModal]);

  const loadStrategies = async () => {
    try {
      const response = await fetch('/api/crypto/strategies');
      if (response.ok) {
        const data = await response.json();
        setStrategies(data);
      }
    } catch (error) {
      console.error('전략 로딩 실패:', error);
    }
  };

  const loadStrategyTrades = async () => {
    try {
      const response = await fetch('/api/crypto/strategy-trades');
      if (response.ok) {
        const data = await response.json();
        setStrategyTrades(data);
      }
    } catch (error) {
      console.error('전략 거래내역 로딩 실패:', error);
    }
  };

  const toggleStrategy = async (strategyId: string, isActive: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/crypto/strategies/${strategyId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        await loadStrategies();
      } else {
        alert('전략 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('전략 토글 실패:', error);
      alert('전략 상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createStrategy = async (template: typeof strategyTemplates[0], market: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/crypto/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          market,
          parameters: template.parameters,
        }),
      });

      if (response.ok) {
        await loadStrategies();
        setShowCreateModal(false);
      } else {
        alert('전략 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('전략 생성 실패:', error);
      alert('전략 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    if (!confirm('정말로 이 전략을 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/crypto/strategies/${strategyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadStrategies();
      } else {
        alert('전략 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('전략 삭제 실패:', error);
      alert('전략 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = selectedStrategy
    ? strategyTrades.filter(trade => trade.strategyId === selectedStrategy)
    : strategyTrades;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">₿ 코인 자동매매</h1>
          <p className="text-gray-400 mt-1">암호화폐 자동매매 전략 관리 및 제어</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          + 새 전략 추가
        </button>
      </div>

      {/* 전략 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">총 전략 수</h3>
          <div className="text-2xl font-bold">{strategies.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">활성 전략</h3>
          <div className="text-2xl font-bold text-green-400">
            {strategies.filter(s => s.isActive).length}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">총 수익</h3>
          <div className={`text-2xl font-bold ${
            strategies.reduce((sum, s) => sum + s.profitLoss, 0) > 0 ? 'text-red-400' : 'text-blue-400'
          }`}>
            ₩{strategies.reduce((sum, s) => sum + s.profitLoss, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-sm text-gray-400 mb-2">총 거래 수</h3>
          <div className="text-2xl font-bold">
            {strategies.reduce((sum, s) => sum + s.totalTrades, 0)}
          </div>
        </div>
      </div>

      {/* 전략 목록 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">🤖 자동매매 전략</h3>
        {strategies.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            등록된 전략이 없습니다. 새 전략을 추가해보세요.
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">{strategy.name}</h4>
                      <span className="text-sm text-gray-400">({strategy.market})</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        strategy.isActive
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {strategy.isActive ? '실행 중' : '중지됨'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{strategy.description}</p>
                    <div className="flex items-center gap-6 mt-2 text-sm">
                      <span className={`${
                        strategy.profitLoss > 0 ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        수익: {strategy.profitLoss > 0 ? '+' : ''}₩{strategy.profitLoss.toLocaleString()}
                      </span>
                      <span className="text-gray-400">
                        거래: {strategy.totalTrades}회
                      </span>
                      <span className="text-gray-400">
                        승률: {strategy.winRate.toFixed(1)}%
                      </span>
                      <span className="text-gray-400">
                        최근 실행: {strategy.lastExecuted || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedStrategy(
                        selectedStrategy === strategy.id ? null : strategy.id
                      )}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      거래내역
                    </button>
                    <button
                      onClick={() => toggleStrategy(strategy.id, !strategy.isActive)}
                      disabled={loading}
                      className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                        strategy.isActive
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {strategy.isActive ? '중지' : '시작'}
                    </button>
                    <button
                      onClick={() => deleteStrategy(strategy.id)}
                      disabled={loading}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 전략별 거래내역 */}
      {filteredTrades.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              📊 전략별 거래내역
              {selectedStrategy && (
                <span className="text-sm text-gray-400 ml-2">
                  ({strategies.find(s => s.id === selectedStrategy)?.name})
                </span>
              )}
            </h3>
            {selectedStrategy && (
              <button
                onClick={() => setSelectedStrategy(null)}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                전체 보기
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-2">전략</th>
                  <th className="text-left py-3 px-2">코인</th>
                  <th className="text-center py-3 px-2">구분</th>
                  <th className="text-right py-3 px-2">수량</th>
                  <th className="text-right py-3 px-2">가격</th>
                  <th className="text-right py-3 px-2">금액</th>
                  <th className="text-center py-3 px-2">상태</th>
                  <th className="text-center py-3 px-2">시간</th>
                  <th className="text-left py-3 px-2">사유</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-2 font-semibold">{trade.strategyName}</td>
                    <td className="py-3 px-2">{trade.market}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.type === 'buy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {trade.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">{trade.quantity.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">₩{trade.price.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-semibold">
                      ₩{trade.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.status === 'completed'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {trade.status === 'completed' ? '성공' : '실패'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      {new Date(trade.timestamp).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-400">{trade.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 전략 생성 모달 */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // 모달 외부 클릭 시 닫기
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">🚀 새 자동매매 전략 추가</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strategyTemplates.map((template, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h4 className="font-semibold text-lg mb-2">{template.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">{template.description}</p>

                    <div className="space-y-2 mb-4">
                      <h5 className="text-sm font-semibold text-gray-300">매개변수:</h5>
                      <div className="text-xs text-gray-400 space-y-1">
                        {Object.entries(template.parameters).map(([key, value]) => (
                          <div key={key}>
                            {key}: {typeof value === 'number' ? value.toLocaleString() : value}
                          </div>
                        ))}
                      </div>
                    </div>

                    <select
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-3"
                      onChange={(e) => {
                        if (e.target.value) {
                          createStrategy(template, e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">코인 선택</option>
                      <option value="KRW-BTC">비트코인 (BTC)</option>
                      <option value="KRW-ETH">이더리움 (ETH)</option>
                      <option value="KRW-XRP">리플 (XRP)</option>
                      <option value="KRW-ADA">에이다 (ADA)</option>
                      <option value="KRW-SOL">솔라나 (SOL)</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}