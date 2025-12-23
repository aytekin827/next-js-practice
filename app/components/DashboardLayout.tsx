'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import TradingProfileModal from './TradingProfileModal';

interface User {
  id: string;
  email?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'analysis' | 'quantum-recommendation' | 'stock-sell' | 'crypto-analysis' | 'crypto-trading' | 'settings';
  onPageChange: (page: 'dashboard' | 'analysis' | 'quantum-recommendation' | 'stock-sell' | 'crypto-analysis' | 'crypto-trading' | 'settings') => void;
}

export default function DashboardLayout({ children, currentPage, onPageChange }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('offline');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = createClient();

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 사용자 인증 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // API 상태 체크
  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setApiStatus(data.status === 'online' ? 'online' : 'offline');
    } catch (error) {
      console.error('API 상태 확인 실패:', error);
      setApiStatus('offline');
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    if (isLoggingOut) return; // 중복 클릭 방지

    setIsLoggingOut(true);

    try {
      // 1. 토큰 정리 API 호출
      const tokenResponse = await fetch('/api/cleanup-tokens', {
        method: 'DELETE',
      });

      if (tokenResponse.ok) {
        console.log('토큰 정리 완료');
      } else {
        console.warn('토큰 정리 실패, 계속 진행');
      }

      // 2. Supabase 로그아웃
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase 로그아웃 오류:', error);
      }

      // 3. 페이지 새로고침 (로그인 페이지로 이동)
      window.location.reload();
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 오류가 발생해도 강제 로그아웃
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('강제 로그아웃도 실패:', signOutError);
      }
      window.location.reload();
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkApiStatus();
      const statusInterval = setInterval(checkApiStatus, 60000); // 1분마다
      return () => clearInterval(statusInterval);
    }
  }, [user]);

  const menuItems = [
    {
      id: 'dashboard' as const,
      name: '통합 대시보드',
      icon: '🏠',
      description: '주식 & 코인 통합 포트폴리오'
    },
    {
      id: 'analysis' as const,
      name: '갭 돌파 전략',
      icon: '📈',
      description: '시초가 갭을 이용한 돌파 전략'
    },
    {
      id: 'quantum-recommendation' as const,
      name: '퀀트 종목추천',
      icon: '🚀',
      description: 'AI 기반 종목 분석 및 추천'
    },
    {
      id: 'stock-sell' as const,
      name: '주식 매도',
      icon: '💰',
      description: '보유 주식 매도 및 주문 관리'
    },
    {
      id: 'crypto-analysis' as const,
      name: '코인시장 분석',
      icon: '📊',
      description: '암호화폐 시장 분석 도구'
    },
    {
      id: 'crypto-trading' as const,
      name: '코인 자동매매',
      icon: '₿',
      description: '암호화폐 자동매매 전략 관리'
    },
    {
      id: 'settings' as const,
      name: '시스템 설정',
      icon: '⚙️',
      description: '거래 설정 및 API 연동 관리'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* 좌측 네비게이션 */}
      <nav className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 로고 */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <h1 className="text-xl font-bold">QuantTower</h1>
              <p className="text-sm text-gray-400">v1.0</p>
            </div>
          </div>
        </div>

        {/* 메뉴 항목들 */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 하단 사용자 정보 */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full text-left p-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user?.email}</div>
                <div className="text-xs text-gray-400">프로필 설정</div>
              </div>
            </div>
          </button>
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 상단 헤더 */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {menuItems.find(item => item.id === currentPage)?.name}
              </h2>
              <p className="text-sm text-gray-400">
                {menuItems.find(item => item.id === currentPage)?.description}
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* API 상태 */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${apiStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">
                  API {apiStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* 현재 시간 */}
              <div className="text-sm font-mono">
                {currentTime.toLocaleTimeString()}
              </div>

              {/* 사용자 정보 및 로그아웃 */}
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      로그아웃 중...
                    </>
                  ) : (
                    <>
                      <span>🚪</span>
                      로그아웃
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* 프로필 모달 */}
      <TradingProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userEmail={user?.email || ''}
      />
    </div>
  );
}