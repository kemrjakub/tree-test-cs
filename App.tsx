import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, Session, TestResult } from './types';
import Navigation from './components/Navigation';
import AdminPanel from './components/AdminPanel';
import StudentMode from './components/StudentMode';
import AdminLogin from './components/AdminLogin';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.STUDENT);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [userId] = useState(() => {
    const saved = localStorage.getItem('tree_test_user_id');
    if (saved) return saved;
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tree_test_user_id', newId);
    return newId;
  });

  // Načtení dat s validací struktury
  useEffect(() => {
    const saved = localStorage.getItem('tree_test_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Fix: Ensure name and createdAt exist for older data
          const validated = parsed.map((s: any) => ({
            ...s,
            name: s.name || `Relace ${s.id}`,
            createdAt: s.createdAt || (s.id.startsWith('session_') ? parseInt(s.id.split('_')[1]) || Date.now() : Date.now()),
            results: Array.isArray(s.results) ? s.results : []
          }));
          setSessions(validated);
          const active = validated.find((s: Session) => s.isActive === true);
          if (active) setCurrentSessionId(active.id);
        }
      } catch (e) {
        console.error("Chyba načítání:", e);
      }
    }
  }, []);

  // Synchronizace s LocalStorage
  useEffect(() => {
    if (sessions.length > 0 || localStorage.getItem('tree_test_sessions')) {
      localStorage.setItem('tree_test_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Fix: Add name and createdAt to new sessions
  const startNewSession = useCallback(() => {
    const timestamp = Date.now();
    const newId = `session_${timestamp}`;
    const newSession: Session = { 
      id: newId, 
      name: `Relace ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
      createdAt: timestamp,
      isActive: true, 
      isCompleted: false, 
      results: [] 
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMode(AppMode.STUDENT);
  }, []);

  const endSession = useCallback(() => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, isActive: false, isCompleted: true } : s
    ));
    setCurrentSessionId(null);
  }, [currentSessionId]);

  const submitResult = useCallback((result: TestResult) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, results: [...(s.results || []), result] } : s
    ));
  }, [currentSessionId]);

  const handleLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const activeSession = sessions.find(s => s && s.id === currentSessionId) || null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation 
        mode={mode} 
        setMode={setMode} 
        isActiveSession={!!currentSessionId}
        isAdminAuthenticated={isAdminAuthenticated}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {mode === AppMode.ADMIN ? (
          isAdminAuthenticated ? (
            <AdminPanel 
              sessions={sessions} 
              activeSessionId={currentSessionId}
              onStartSession={startNewSession}
              onEndSession={endSession}
            />
          ) : (
            <AdminLogin onLoginSuccess={handleLoginSuccess} />
          )
        ) : (
          <StudentMode 
            userId={userId}
            activeSession={activeSession}
            onSubmitResult={submitResult}
          />
        )}
      </main>

      <footer className="p-8 text-center">
         <button 
           onClick={() => {
             if (window.confirm('Opravdu chcete smazat všechna data?')) {
               localStorage.clear(); 
               window.location.reload();
             }
           }} 
           className="text-[10px] text-gray-200 opacity-30 hover:opacity-100 hover:text-red-400 transition-all font-normal cursor-pointer"
         >
           Resetovat aplikaci (pro vývojáře)
         </button>
      </footer>
    </div>
  );
};

export default App;