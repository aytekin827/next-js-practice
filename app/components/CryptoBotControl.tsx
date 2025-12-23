'use client';

import { useState, useEffect } from 'react';

interface RunningCoin {
  market: string;
  korean_name: string;
  english_name: string;
  symbol: string;
  startTime: string;
}

interface BotStatus {
  isRunning: boolean;
  lastUpdate: string;
  message: string;
  runningCoins: RunningCoin[];
}

interface UpbitMarket {
  market: string;
  korean_name: string;
  english_name: string;
  symbol: string;
}

export default function CryptoBotControl() {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isRunning: false,
    lastUpdate: '',
    message: '봇 상태를 확인하는 중...',
    runningCoins: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState("KRW-BTC");

  // Upbit 마켓 데이터
  const [markets, setMarkets] = useState<UpbitMarket[]>([]);
  const [coinSearch, setCoinSearch] = useState('');
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);

  // 인기 코인 목록 (KRW 기준)
  const popularCoins = [
    'KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-ADA', 'KRW-DOT',
    'KRW-LINK', 'KRW-SOL', 'KRW-AVAX', 'KRW-DOGE', 'KRW-MATIC'
  ];

  // 검색된 코인 필터링
  const filteredCoins = markets.filter(market =>
    coinSearch && (
      market.korean_name.toLowerCase().includes(coinSearch.toLowerCase()) ||
      market.english_name.toLowerCase().includes(coinSearch.toLowerCase()) ||
      market.symbol.toLowerCase().includes(coinSearch.toLowerCase()) ||
      market.market.toLowerCase().includes(coinSearch.toLowerCase())
    )
  ).slice(0, 10); // 최대 10개만 표시

  // Upbit 마켓 데이터 로드
  const loadUpbitMarkets = async () => {
    setIsLoadingMarkets(true);
    try {
      const response = await fetch('/api/upbit-markets');
      const data = await response.json();

      if (response.ok && data.success) {
        setMarkets(data.markets);
      } else {
        console.error('Upbit 마켓 로드 실패:', data.error);
      }
    } catch (error) {
      console.error('Upbit 마켓 로드 오류:', error);
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  // 봇 상태 확인
  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/crypto-bot/status');
      const data = await response.json();

      if (response.ok) {
        setBotStatus(data);
        setError(null);
      } else {
        setError(data.error || '봇 상태 확인 실패');
      }
    } catch (error) {
      console.error('봇 상태 확인 오류:', error);
      setError('봇 서버와 연결할 수 없습니다');
    }
  };

  // 봇 시작 (선택된 코인 정보 포함)
  const startBot = async (coinMarket: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crypto-bot/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedCoin: coinMarket
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // 상태 새로고침으로 최신 정보 가져오기
        await checkBotStatus();
      } else {
        setError(data.error || '봇 시작 실패');
      }
    } catch (error) {
      console.error('봇 시작 오류:', error);
      setError('봇 서버와 연결할 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 봇 중지 (특정 코인)
  const stopBot = async (coinMarket: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/crypto-bot/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedCoin: coinMarket
        }),
      });
      const data = await response.json();

      if (response.ok) {
        // 상태 새로고침으로 최신 정보 가져오기
        await checkBotStatus();
      } else {
        setError(data.error || '봇 중지 실패');
      }
    } catch (error) {
      console.error('봇 중지 오류:', error);
      setError('봇 서버와 연결할 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 선택된 코인의 정보 가져오기
  const getSelectedCoinInfo = () => {
    return markets.find(market => market.market === selectedCoin);
  };

  // 코인 마켓으로 코인 정보 가져오기 (실행 중인 코인 표시용)
  const getCoinInfo = (coinMarket: string) => {
    const marketInfo = markets.find(market => market.market === coinMarket);
    if (marketInfo) {
      return {
        korean_name: marketInfo.korean_name,
        english_name: marketInfo.english_name,
        symbol: marketInfo.symbol
      };
    }
    // Upbit 데이터가 없는 경우 기본값 반환
    return {
      korean_name: coinMarket.replace('KRW-', ''),
      english_name: coinMarket.replace('KRW-', ''),
      symbol: coinMarket.replace('KRW-', '')
    };
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    checkBotStatus();
    loadUpbitMarkets();

    // 30초마다 상태 확인
    const interval = setInterval(checkBotStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">

      {/* 봇 상태 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">🤖 봇 상태</h3>

        <div className="space-y-4">
          {/* 전체 상태 표시 */}
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${
              botStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <div>
              <div className="font-semibold">
                {botStatus.isRunning ? `실행 중 (${botStatus.runningCoins.length}개 코인)` : '중지됨'}
              </div>
              <div className="text-sm text-gray-400">
                {botStatus.message}
              </div>
            </div>
          </div>

          {/* 실행 중인 코인들 */}
          {botStatus.runningCoins.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-green-400 font-medium">실행 중인 코인들</div>
              {botStatus.runningCoins.map((coin) => {
                const coinInfo = getCoinInfo(coin.market);
                return (
                  <div key={coin.market} className="bg-green-900/20 border border-green-700 rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="text-green-300 font-medium">
                        {coinInfo.korean_name} ({coinInfo.symbol})
                      </div>
                      <div className="text-sm text-green-400">
                        {coin.market} • 시작: {new Date(coin.startTime).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => stopBot(coin.market)}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      중지
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 마지막 업데이트 시간 */}
          {botStatus.lastUpdate && (
            <div className="text-sm text-gray-500">
              마지막 업데이트: {new Date(botStatus.lastUpdate).toLocaleString()}
            </div>
          )}

          {/* 오류 메시지 */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded p-3 text-red-400">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      {/* 코인 선택 섹션 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">💰 코인 선택</h3>

        {/* 인기 코인 빠른 선택 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-3">인기 코인 (KRW 마켓)</label>
          <div className="flex flex-wrap gap-2">
            {popularCoins.map((coin) => {
              const coinInfo = markets.find(m => m.market === coin);
              return (
                <button
                  key={coin}
                  onClick={() => setSelectedCoin(coin)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCoin === coin
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {coinInfo ? coinInfo.symbol : coin.replace('KRW-', '')}
                  {coinInfo && (
                    <div className="text-xs text-gray-400">
                      {coinInfo.korean_name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 코인 검색 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            코인 검색 {isLoadingMarkets && <span className="text-blue-400">(로딩 중...)</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={coinSearch}
              onChange={(e) => setCoinSearch(e.target.value)}
              placeholder="코인명, 심볼 검색 (예: 비트코인, BTC, 이더리움...)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            {coinSearch && filteredCoins.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto z-10">
                {filteredCoins.map((coin) => (
                  <button
                    key={coin.market}
                    onClick={() => {
                      setSelectedCoin(coin.market);
                      setCoinSearch('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-600 text-white border-b border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium">{coin.korean_name}</div>
                    <div className="text-sm text-gray-400">
                      {coin.market} • {coin.english_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {coinSearch && filteredCoins.length === 0 && (
            <div className="text-sm text-gray-500 mt-2">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        {/* 선택된 코인 표시 및 제어 */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">선택된 코인:</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-blue-400">
                {getSelectedCoinInfo()?.korean_name || selectedCoin}
              </div>
              <div className="text-sm text-gray-400">
                {selectedCoin} • {getSelectedCoinInfo()?.english_name}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-400">마켓</div>
                <div className="font-mono text-yellow-400">{selectedCoin}</div>
              </div>
              {/* 개별 코인 제어 버튼 */}
              <div className="flex gap-2">
                {botStatus.runningCoins.some(coin => coin.market === selectedCoin) ? (
                  <button
                    onClick={() => stopBot(selectedCoin)}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        중지 중...
                      </>
                    ) : (
                      <>
                        ⏹️ 중지
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => startBot(selectedCoin)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        시작 중...
                      </>
                    ) : (
                      <>
                        ▶️ 시작
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 전체 제어 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">🎮 전체 제어</h3>

        <div className="flex gap-4">
          <button
            onClick={checkBotStatus}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            🔄 상태 새로고침
          </button>

          {botStatus.runningCoins.length > 0 && (
            <button
              onClick={() => {
                // 모든 실행 중인 코인 중지
                botStatus.runningCoins.forEach(coin => stopBot(coin.market));
              }}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              ⏹️ 모든 봇 중지
            </button>
          )}
        </div>
      </div>

      {/* 봇 서버 정보 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">🔧 서버 정보</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">봇 서버 주소:</span>
            <span className="font-mono">localhost:8001</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">거래소:</span>
            <span className="text-blue-400">Upbit (KRW 마켓)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">인증 방식:</span>
            <span className="font-mono">Authorization 헤더</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">시크릿 키:</span>
            <span className="font-mono text-yellow-400">2121</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">연결 상태:</span>
            <span className={error ? 'text-red-400' : 'text-green-400'}>
              {error ? '연결 실패' : '연결됨'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">자동 상태 확인:</span>
            <span className="text-blue-400">30초마다</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">사용 가능한 코인:</span>
            <span className="text-green-400">{markets.length}개</span>
          </div>
        </div>
      </div>

      {/* 사용 안내 */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="font-semibold text-blue-400 mb-2">📋 사용 안내</h4>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• 거래할 코인을 선택한 후 개별적으로 시작/중지할 수 있습니다</li>
          <li>• 여러 코인을 동시에 자동매매할 수 있습니다</li>
          <li>• KRW(원화) 마켓의 코인만 거래 가능합니다</li>
          <li>• 실행 중인 코인은 상태 섹션에서 개별 중지가 가능합니다</li>
          <li>• 상태는 30초마다 자동으로 업데이트됩니다</li>
          <li>• 모든 요청은 Authorization 헤더로 인증됩니다</li>
        </ul>
      </div>
    </div>
  );
}