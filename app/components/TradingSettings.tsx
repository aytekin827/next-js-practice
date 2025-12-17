'use client';

import { useState, useEffect } from 'react';

interface TradingSettings {
  defaultStopLossPercent: number;
  defaultProfitPercent: number;
  maxAmountPerStock: number;
  gapFilterMinPercent: number;
  gapFilterMaxPercent: number;
  defaultStockCount: number;
  defaultMinVolume: number;
  defaultMarket: 'KOSPI' | 'KOSDAQ';
  // 퀀텀종목추천 관련 설정
  quantumDefaultProfitPercent: number;
  quantumDefaultStopLossPercent: number;
  quantumMaxAmountPerStock: number;
}

export default function TradingSettings() {
  const [settings, setSettings] = useState<TradingSettings>({
    defaultStopLossPercent: 3.0,
    defaultProfitPercent: 1.0,
    maxAmountPerStock: 50000,
    gapFilterMinPercent: 3.0,
    gapFilterMaxPercent: 7.0,
    defaultStockCount: 20,
    defaultMinVolume: 50000,
    defaultMarket: 'KOSPI',
    // 퀀텀종목추천 기본값
    quantumDefaultProfitPercent: 1.0,
    quantumDefaultStopLossPercent: 3.0,
    quantumMaxAmountPerStock: 50000
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 접기/펼치기 상태
  const [expandedSections, setExpandedSections] = useState({
    gapBreakout: true,
    quantum: true
  });

  // 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/trading-settings');
      const data = await response.json();

      if (response.ok) {
        setSettings(data);
      } else {
        console.error('설정 로드 실패:', data.error);
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/trading-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '설정이 저장되었습니다' });
      } else {
        setMessage({ type: 'error', text: data.error || '설정 저장에 실패했습니다' });
      }
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
      setMessage({ type: 'error', text: '설정 저장 중 오류가 발생했습니다' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      defaultStopLossPercent: 3.0,
      defaultProfitPercent: 1.0,
      maxAmountPerStock: 50000,
      gapFilterMinPercent: 3.0,
      gapFilterMaxPercent: 7.0,
      defaultStockCount: 20,
      defaultMinVolume: 50000,
      defaultMarket: 'KOSPI',
      // 퀀텀종목추천 기본값
      quantumDefaultProfitPercent: 1.0,
      quantumDefaultStopLossPercent: 3.0,
      quantumMaxAmountPerStock: 50000
    });
    setMessage(null);
  };

  // 섹션 토글 함수
  const toggleSection = (section: 'gapBreakout' | 'quantum') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <div className="text-center mt-4 text-gray-400">설정을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⚙️ 트레이딩 설정</h1>
        <div className="flex gap-3">
          <button
            onClick={resetToDefaults}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            기본값으로 초기화
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-900/20 border border-green-700 text-green-400'
            : 'bg-red-900/20 border border-red-700 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* 시초가 갭 & 돌파 전략 설정 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div
          className="p-6 cursor-pointer hover:bg-gray-700/30 transition-colors"
          onClick={() => toggleSection('gapBreakout')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <h2 className="text-lg font-semibold">시초가 갭 & 돌파(Gap & Breakout) 전략 설정</h2>
                <p className="text-sm text-gray-400">시초가 갭을 이용한 돌파 전략에서 사용되는 설정값</p>
              </div>
            </div>
            <div className={`transform transition-transform ${expandedSections.gapBreakout ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {expandedSections.gapBreakout && (
          <div className="px-6 pb-6 border-t border-gray-600">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* 손절/익절 설정 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">💰 손절/익절 설정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">기본 손절 퍼센트 (%)</label>
                    <input
                      type="number"
                      value={settings.defaultStopLossPercent}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaultStopLossPercent: parseFloat(e.target.value) || 0
                      }))}
                      step="0.1"
                      min="0"
                      max="50"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">매수가 대비 하락 시 자동 매도할 퍼센트</div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">기본 익절 퍼센트 (%)</label>
                    <input
                      type="number"
                      value={settings.defaultProfitPercent}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaultProfitPercent: parseFloat(e.target.value) || 0
                      }))}
                      step="0.1"
                      min="0"
                      max="50"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">매수가 대비 상승 시 자동 매도할 퍼센트</div>
                  </div>
                </div>
              </div>

              {/* 일괄매수 설정 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">📦 일괄매수 설정</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">종목당 최대 금액 (원)</label>
                  <input
                    type="number"
                    value={settings.maxAmountPerStock}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxAmountPerStock: parseInt(e.target.value) || 0
                    }))}
                    step="1000"
                    min="1000"
                    max="10000000"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    일괄매수 시 각 종목에 투자할 최대 금액<br/>
                    현재 설정: ₩{settings.maxAmountPerStock.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 시초가 갭 필터링 설정 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">📊 갭 필터링 설정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">갭 하한 퍼센트 (%)</label>
                    <input
                      type="number"
                      value={settings.gapFilterMinPercent}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        gapFilterMinPercent: parseFloat(e.target.value) || 0
                      }))}
                      step="0.1"
                      min="0"
                      max="20"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">시가가 전일 종가 대비 최소 상승 퍼센트</div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">갭 상한 퍼센트 (%)</label>
                    <input
                      type="number"
                      value={settings.gapFilterMaxPercent}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        gapFilterMaxPercent: parseFloat(e.target.value) || 0
                      }))}
                      step="0.1"
                      min="0"
                      max="20"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">시가가 전일 종가 대비 최대 상승 퍼센트</div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
                    <div className="text-xs text-blue-400">
                      현재 필터링 범위: {settings.gapFilterMinPercent}% ~ {settings.gapFilterMaxPercent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 조회 조건 기본값 */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">🔍 조회 조건 설정</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">기본 시장</label>
                    <select
                      value={settings.defaultMarket}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaultMarket: e.target.value as 'KOSPI' | 'KOSDAQ'
                      }))}
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    >
                      <option value="KOSPI">KOSPI</option>
                      <option value="KOSDAQ">KOSDAQ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">기본 분석 종목 개수</label>
                    <input
                      type="number"
                      value={settings.defaultStockCount}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaultStockCount: parseInt(e.target.value) || 0
                      }))}
                      min="10"
                      max="100"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">등락률 상위 종목 조회 개수</div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">기본 최소 거래량 (주)</label>
                    <input
                      type="number"
                      value={settings.defaultMinVolume}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        defaultMinVolume: parseInt(e.target.value) || 0
                      }))}
                      step="1000"
                      min="1000"
                      className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      필터링할 최소 거래량<br/>
                      현재 설정: {(settings.defaultMinVolume / 1000).toFixed(0)}K주
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 퀀텀종목추천 설정 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div
          className="p-6 cursor-pointer hover:bg-gray-700/30 transition-colors"
          onClick={() => toggleSection('quantum')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h2 className="text-lg font-semibold">퀀텀종목추천 설정</h2>
                <p className="text-sm text-gray-400">CSV 파일 업로드를 통한 퀀텀 종목 추천에서 사용되는 설정값</p>
              </div>
            </div>
            <div className={`transform transition-transform ${expandedSections.quantum ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {expandedSections.quantum && (
          <div className="px-6 pb-6 border-t border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">💰 익절 설정</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">퀀텀 기본 익절 퍼센트 (%)</label>
                  <input
                    type="number"
                    value={settings.quantumDefaultProfitPercent}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      quantumDefaultProfitPercent: parseFloat(e.target.value) || 0
                    }))}
                    step="0.1"
                    min="0"
                    max="50"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">퀀텀 종목 매수 시 기본 익절 퍼센트</div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">🛡️ 손절 설정</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">퀀텀 기본 손절 퍼센트 (%)</label>
                  <input
                    type="number"
                    value={settings.quantumDefaultStopLossPercent}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      quantumDefaultStopLossPercent: parseFloat(e.target.value) || 0
                    }))}
                    step="0.1"
                    min="0"
                    max="50"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">퀀텀 종목 매수 시 기본 손절 퍼센트</div>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-4 text-gray-200">📦 일괄매수 설정</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">퀀텀 종목당 최대 금액 (원)</label>
                  <input
                    type="number"
                    value={settings.quantumMaxAmountPerStock}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      quantumMaxAmountPerStock: parseInt(e.target.value) || 0
                    }))}
                    step="1000"
                    min="1000"
                    max="10000000"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    퀀텀 일괄매수 시 종목당 최대 투자 금액<br/>
                    현재 설정: ₩{settings.quantumMaxAmountPerStock.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}