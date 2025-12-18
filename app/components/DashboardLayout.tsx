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
  currentPage: 'dashboard' | 'analysis' | 'quantum-recommendation' | 'settings';
  onPageChange: (page: 'dashboard' | 'analysis' | 'quantum-recommendation' | 'settings') => void;
}

export default function DashboardLayout({ children, currentPage, onPageChange }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('offline');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
      name: '대시보드',
      icon: '📊',
      description: '계좌 현황 및 봇 제어'
    },
    {
      id: 'analysis' as const,
      name: '시초가 갭 & 돌파(Gap & Breakout) 전략',
      icon: '📈',
      description: '시초가 갭을 이용한 돌파 전략'
    },
    {
      id: 'quantum-recommendation' as const,
      name: '퀀트종목추천',
      icon: '🚀',
      description: 'CSV 파일 업로드를 통한 퀀트 종목 추천 및 매수'
    },
    {
      id: 'settings' as const,
      name: '트레이딩 설정',
      icon: '⚙️',
      description: '전략 및 기본값 설정'
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