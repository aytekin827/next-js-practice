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
    defaultMarket: 'KOSPI'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      defaultMarket: 'KOSPI'
    });
    setMessage(null);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 손절/익절 설정 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">💰 손절/익절 기본 설정</h2>

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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
              <div className="text-xs text-gray-500 mt-1">매수가 대비 상승 시 자동 매도할 퍼센트</div>
            </div>
          </div>
        </div>

        {/* 일괄매수 설정 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">📦 일괄매수 설정</h2>

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
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            />
            <div className="text-xs text-gray-500 mt-1">
              일괄매수 시 각 종목에 투자할 최대 금액<br/>
              현재 설정: ₩{settings.maxAmountPerStock.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 시초가 갭 필터링 설정 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">📈 시초가 갭 필터링 설정</h2>

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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">🔍 조회 조건 기본값</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">기본 시장</label>
              <select
                value={settings.defaultMarket}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  defaultMarket: e.target.value as 'KOSPI' | 'KOSDAQ'
                }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
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
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              />
              <div className="text-xs text-gray-500 mt-1">
                필터링할 최소 거래량<br/>
                현재 설정: {(settings.defaultMinVolume / 1000).toFixed(0)}K주
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 미리보기 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">👁️ 설정 미리보기</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">손절/익절</div>
            <div className="text-white font-semibold">
              -{settings.defaultStopLossPercent}% / +{settings.defaultProfitPercent}%
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">종목당 최대</div>
            <div className="text-white font-semibold">
              ₩{settings.maxAmountPerStock.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">갭 필터링</div>
            <div className="text-white font-semibold">
              {settings.gapFilterMinPercent}% ~ {settings.gapFilterMaxPercent}%
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">조회 조건</div>
            <div className="text-white font-semibold">
              {settings.defaultMarket} / {settings.defaultStockCount}종목
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}