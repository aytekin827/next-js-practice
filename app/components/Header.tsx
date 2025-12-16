'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import ProfileModal from './ProfileModal';

interface HeaderProps {
  userEmail: string;
  onLogout: () => void;
  onProfileUpdate?: () => void;
}

export default function Header({ userEmail, onLogout, onProfileUpdate }: HeaderProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleProfileUpdate = () => {
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Trading Notes</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              title="프로필 설정"
            >
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                {userEmail.charAt(0).toUpperCase()}
              </span>
              <span>{userEmail}</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userEmail={userEmail}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
}