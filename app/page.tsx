'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import LoginForm from './components/LoginForm';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import StockAnalysis from './components/StockAnalysis';
import QuantRecommendation from './components/QuantRecommendation';
import TradingSettings from './components/TradingSettings';

interface User {
  id: string;
  email?: string;
}

export default function TradingDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'analysis' | 'quantum-recommendation' | 'settings'>('dashboard');

  const supabase = createClient();

  // 사용자 인증 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLoginSuccess = () => {
    // 로그인 성공 시 자동으로 사용자 상태가 업데이트됨
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-xl text-white">⚡ 시스템 로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <DashboardLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
    >
      {currentPage === 'dashboard' && <DashboardHome />}
      {currentPage === 'analysis' && <StockAnalysis />}
      {currentPage === 'quantum-recommendation' && <QuantRecommendation />}
      {currentPage === 'settings' && <TradingSettings />}
    </DashboardLayout>
  );
}