import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, Session, TestResult } from './types';
import Navigation from './components/Navigation';
import AdminPanel from './components/AdminPanel';
import StudentMode from './components/StudentMode';
import AdminLogin from './components/AdminLogin';
// IMPORT SUPABASE KLIENTA
import { supabase } from './supabase'; 

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.STUDENT);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const [userId] = useState(() => {
    const storageKey = 'tree_test_unique_user_id';
    const saved = localStorage.getItem(storageKey);
    if (saved && saved.startsWith('user_')) return saved;
    const newId = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, newId);
    return newId;
  });

  const loadDataFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, results(*)');

    if (error) {
      console.error('Chyba při načítání dat:', error);
      return;
    }

    if (data) {
      const formattedSessions: Session[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        createdAt: new Date(s.created_at).getTime(),
        isActive: s.is_active,
        isCompleted: !s.is_active,
        results: (s.results || []).map((r: any) => ({
          userId: r.user_id,
          questionIndex: r.question_index,
          targetFound: r.target_found,
          fullHistory: r.full_history,
          timestamp: new Date(r.created_at).getTime()
        }))
      }));
      
      setSessions(formattedSessions);
      const active = formattedSessions.find(s => s.isActive === true);
      setCurrentSessionId(active ? active.id : null);
    }
  }, []);

  useEffect(() => {
    loadDataFromSupabase();
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadDataFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDataFromSupabase]);

  const startNewSession = useCallback(async () => {
    const sessionName = prompt('Zadejte název nové testovací relace:');
    if (!sessionName) return;
    await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ name: sessionName, is_active: true }])
      .select().single();
    if (!error && data) {
      setCurrentSessionId(data.id);
      setMode(AppMode.STUDENT);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!currentSessionId) return;
    await supabase.from('sessions').update({ is_active: false }).eq('id', currentSessionId);
    setCurrentSessionId(null);
    loadDataFromSupabase();
  }, [currentSessionId, loadDataFromSupabase]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!window.confirm('Opravdu chcete tuto relaci a všechny její výsledky smazat?')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (!error) loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  const submitResult = useCallback(async (result: TestResult) => {
    if (!currentSessionId) return;
    await supabase.from('results').insert([{
      session_id: currentSessionId,
      user_id: userId,
      question_index: result.questionIndex,
      target_found: result.targetFound,
      full_history: result.fullHistory
    }]);
  }, [currentSessionId, userId]);

  const activeSession = sessions.find(s => s && s.id === currentSessionId) || null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation 
        mode={mode} setMode={setMode} 
        isActiveSession={!!currentSessionId}
        isAdminAuthenticated={isAdminAuthenticated}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        {mode === AppMode.ADMIN ? (
          isAdminAuthenticated ? (
            <AdminPanel sessions={sessions} activeSessionId={currentSessionId}
              onStartSession={startNewSession} onEndSession={endSession} onDeleteSession={deleteSession}
            />
          ) : ( <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} /> )
        ) : (
          <StudentMode userId={userId} activeSession={activeSession} onSubmitResult={submitResult} />
        )}
      </main>
      <footer className="p-8 text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">
         Powered by Interaction Design Team • Cloud Connected • {userId}
      </footer>
      
    </div>
  );
};

export default App;