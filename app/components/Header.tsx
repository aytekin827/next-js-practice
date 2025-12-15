'use client';

import { createClient } from '@/utils/supabase/client';

interface HeaderProps {
  userEmail: string;
  onLogout: () => void;
}

export default function Header({ userEmail, onLogout }: HeaderProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">📖 Study Notes</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <span>{userEmail}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}