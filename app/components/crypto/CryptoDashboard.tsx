'use client';

import { useState, useEffect } from 'react';

interface CryptoAsset {
  currency: string;
  balance: number;
  locked: number;
  avgBuyPrice: number;
  avgBuyPriceModified: boolean;
  unitCurrency: string;
  currentPrice?: number;
  totalValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export default function CryptoDashboard() {
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 임시 데이터로 테스트
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <div className="text-center mt-4 text-gray-400">코인 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 코인 대시보드</h1>
        <p className="text-gray-400 mt-1">암호화폐 포트폴리오 및 수익 현황</p>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400">
          코인 대시보드 기능을 구현 중입니다...
        </div>
      </div>
    </div>
  );
}