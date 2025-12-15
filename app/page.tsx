'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import LoginForm from './components/LoginForm';
import Header from './components/Header';

interface Note {
  id: string; // UUID는 string 타입
  content: string;
  created_at: string;
}

interface User {
  id: string;
  email?: string;
}

export default function StudyNotebook() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string; content: string } | null>(null);

  const supabase = createClient();

  // 사용자 인증 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkUser();

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // 글 불러오기 함수
  const loadNotes = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data || []);
      }
    } catch (error) {
      console.error('글 불러오기 실패:', error);
    }
  }, [user]);

  // 글 저장 함수
  const saveNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      });
      
      if (response.ok) {
        setNewNote('');
        setIsWriting(false);
        loadNotes();
      }
    } catch (error) {
      console.error('글 저장 실패:', error);
    }
  };

  // 글 삭제 함수
  const deleteNote = async (noteId: string) => {
    if (!confirm('정말로 이 노트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes?id=${noteId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadNotes(); // 삭제 후 목록 새로고침
      } else {
        const errorData = await response.json();
        alert('삭제 실패: ' + errorData.error);
      }
    } catch (error) {
      console.error('글 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 글 수정 시작
  const startEditNote = (note: Note) => {
    setEditingNote({ id: note.id, content: note.content });
  };

  // 글 수정 취소
  const cancelEditNote = () => {
    setEditingNote(null);
  };

  // 글 수정 저장
  const updateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;

    try {
      const response = await fetch(`/api/notes?id=${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editingNote.content }),
      });
      
      if (response.ok) {
        setEditingNote(null);
        loadNotes(); // 수정 후 목록 새로고침
      } else {
        const errorData = await response.json();
        alert('수정 실패: ' + errorData.error);
      }
    } catch (error) {
      console.error('글 수정 실패:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // 사용자가 로그인했을 때 노트 불러오기
  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [loadNotes, user]); // loadNotes 의존성 제거

  const handleLoginSuccess = () => {
    // 로그인 성공 시 자동으로 사용자 상태가 업데이트됨
  };

  const handleLogout = () => {
    setUser(null);
    setNotes([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">📚 로딩 중...</div>
      </div>
    );
  }

  // 로그인하지 않은 경우 로그인 폼 표시
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // 로그인한 경우 노트 앱 표시
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header userEmail={user.email || ''} onLogout={handleLogout} />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* 새 노트 작성 영역 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                ✏️ 새로운 학습 내용
              </h2>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>
            
            {!isWriting ? (
              <button
                onClick={() => setIsWriting(true)}
                className="w-full p-4 text-left text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                💭 오늘 무엇을 배웠나요? 클릭해서 작성해보세요...
              </button>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="오늘 배운 내용을 자유롭게 적어보세요...&#10;&#10;예시:&#10;• JavaScript의 Promise와 async/await 학습&#10;• React Hook의 useEffect 사용법&#10;• 알고리즘 문제 해결 과정"
                  className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={saveNote}
                    disabled={!newNote.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    💾 저장하기
                  </button>
                  <button
                    onClick={() => {
                      setIsWriting(false);
                      setNewNote('');
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 저장된 노트들 */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              📚 학습 기록 ({notes.length}개)
            </h2>
            
            {notes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">아직 작성된 노트가 없어요</h3>
                <p className="text-gray-500">첫 번째 학습 노트를 작성해보세요!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {notes.map((note, index) => (
                  <div key={note.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-l-4 border-green-500">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <span className="text-sm font-medium text-gray-600">
                            학습 노트 #{notes.length - index}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            🕒 {new Date(note.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <button
                            onClick={() => startEditNote(note)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                            title="노트 수정"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="노트 삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      {/* 수정 모드일 때 */}
                      {editingNote && editingNote.id === note.id ? (
                        <div className="space-y-4">
                          <textarea
                            value={editingNote.content}
                            onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                            className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={updateNote}
                              disabled={!editingNote.content.trim()}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              💾 저장
                            </button>
                            <button
                              onClick={cancelEditNote}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 일반 보기 모드 */
                        <div className="prose max-w-none">
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}