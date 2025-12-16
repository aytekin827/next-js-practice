'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface TradingProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

interface KISSettings {
  KIS_APP_KEY: string;
  KIS_APP_SECRET: string;
  KIS_CANO: string;
  KIS_ACNT_PRDT_CD: string;
  KIS_BASE_URL: string;
}

export default function TradingProfileModal({ isOpen, onClose, userEmail }: TradingProfileModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'password' | 'kis'>('password');
  const [kisSettings, setKisSettings] = useState<KISSettings>({
    KIS_APP_KEY: '',
    KIS_APP_SECRET: '',
    KIS_CANO: '',
    KIS_ACNT_PRDT_CD: '',
    KIS_BASE_URL: 'https://openapi.koreainvestment.com:9443'
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setMessage('');
      setActiveTab('password');
      loadKISSettings();
    }
  }, [isOpen]);

  const loadKISSettings = async () => {
    try {
      const response = await fetch('/api/kis-settings');
      if (response.ok) {
        const data = await response.json();
        setKisSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('KIS 설정 로딩 실패:', error);
    }
  };

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('비밀번호가 성공적으로 변경되었습니다.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateKISSettings = async () => {
    if (!kisSettings.KIS_APP_KEY || !kisSettings.KIS_APP_SECRET || !kisSettings.KIS_CANO) {
      setMessage('필수 항목을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/kis-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kisSettings),
      });

      if (response.ok) {
        setMessage('한국투자증권 설정이 성공적으로 저장되었습니다.');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || '설정 저장에 실패했습니다.');
      }
    } catch (error) {
      setMessage('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKISChange = (field: keyof KISSettings, value: string) => {
    setKisSettings(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">⚙️ 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'password'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🔒 비밀번호 변경
          </button>
          <button
            onClick={() => setActiveTab('kis')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'kis'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🏦 한국투자증권 API
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          {activeTab === 'password' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  현재 이메일
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                  placeholder="새 비밀번호 (최소 6자)"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                  placeholder="새 비밀번호 다시 입력"
                  minLength={6}
                />
              </div>

              <button
                onClick={updatePassword}
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '처리 중...' : '비밀번호 변경'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    APP KEY *
                  </label>
                  <input
                    type="text"
                    value={kisSettings.KIS_APP_KEY}
                    onChange={(e) => handleKISChange('KIS_APP_KEY', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    placeholder="한국투자증권 APP KEY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    APP SECRET *
                  </label>
                  <input
                    type="password"
                    value={kisSettings.KIS_APP_SECRET}
                    onChange={(e) => handleKISChange('KIS_APP_SECRET', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    placeholder="한국투자증권 APP SECRET"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    계좌번호 *
                  </label>
                  <input
                    type="text"
                    value={kisSettings.KIS_CANO}
                    onChange={(e) => handleKISChange('KIS_CANO', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    placeholder="계좌번호 (8자리)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    계좌상품코드 *
                  </label>
                  <input
                    type="text"
                    value={kisSettings.KIS_ACNT_PRDT_CD}
                    onChange={(e) => handleKISChange('KIS_ACNT_PRDT_CD', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                    placeholder="계좌상품코드 (01)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API 서버 URL
                </label>
                <select
                  value={kisSettings.KIS_BASE_URL}
                  onChange={(e) => handleKISChange('KIS_BASE_URL', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                >
                  <option value="https://openapi.koreainvestment.com:9443">실전투자 (운영)</option>
                  <option value="https://openapivts.koreainvestment.com:29443">모의투자 (테스트)</option>
                </select>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-400 mb-2">⚠️ 보안 안내</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• API 키는 암호화되어 안전하게 저장됩니다</li>
                  <li>• 계좌번호는 8자리 숫자로 입력해주세요</li>
                  <li>• 계좌상품코드는 일반적으로 "01"입니다</li>
                  <li>• 모의투자로 먼저 테스트해보시기 바랍니다</li>
                </ul>
              </div>

              <button
                onClick={updateKISSettings}
                disabled={loading || !kisSettings.KIS_APP_KEY || !kisSettings.KIS_APP_SECRET || !kisSettings.KIS_CANO}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '저장 중...' : 'API 설정 저장'}
              </button>
            </div>
          )}

          {/* 메시지 */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('성공') || message.includes('저장')
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-red-900 text-red-300 border border-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}