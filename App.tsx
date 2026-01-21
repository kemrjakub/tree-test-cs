import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, Session, TestResult } from './types';
import Navigation from './components/Navigation';
import AdminPanel from './components/AdminPanel';
import StudentMode from './components/StudentMode';
import AdminLogin from './components/AdminLogin';
// IMPORTUJEME TVOJE PŘIPOJENÍ
import { supabase } from './supabase'; 

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

  // 1. FUNKCE PRO NAČTENÍ DAT ZE SUPABASE
  const loadDataFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, results(*)');

    if (error) {
      console.error("Chyba při načítání ze Supabase:", error);
      return;
    }

    if (data) {
      const validated: Session[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        createdAt: new Date(s.created_at).getTime(),
        isActive: s.is_active,
        isCompleted: !s.is_active,
        results: Array.isArray(s.results) ? s.results : []
      }));
      
      setSessions(validated);
      
      // Automaticky najít a nastavit ID aktivní relace
      const active = validated.find(s => s.isActive === true);
      if (active) {
        setCurrentSessionId(active.id);
      } else {
        setCurrentSessionId(null);
      }
    }
  }, []);

  // 2. NAČTENÍ PŘI STARTU A NASTAVENÍ REÁLNÉHO ČASU
  useEffect(() => {
    loadDataFromSupabase();

    // Sledování změn v DB v reálném čase
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

  // 3. START NOVÉ RELACE V SUPABASE
  const startNewSession = useCallback(async () => {
    const timestamp = Date.now();
    const sessionName = prompt('Zadejte název relace:', `Relace ${new Date(timestamp).toLocaleDateString()}`);
    
    if (!sessionName) return;

    const { data, error } = await supabase
      .from('sessions')
      .insert([{ name: sessionName, is_active: true }])
      .select()
      .single();

    if (error) {
      alert('Chyba při vytváření relace v databázi.');
      console.error(error);
    } else if (data) {
      setCurrentSessionId(data.id);
      setMode(AppMode.STUDENT);
    }
  }, []);

  // 4. UKONČENÍ RELACE V SUPABASE
  const endSession = useCallback(async () => {
    if (!currentSessionId) return;

    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('id', currentSessionId);

    if (error) {
      console.error('Chyba při ukončování relace:', error);
    } else {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  // 5. ODESLÁNÍ VÝSLEDKU DO SUPABASE
  const submitResult = useCallback(async (result: TestResult) => {
    if (!currentSessionId) return;

    const { error } = await supabase
      .from('results')
      .insert([{
        session_id: currentSessionId,
        user_id: userId,
        question_index: result.questionIndex,
        target_found: result.targetFound,
        full_history: result.fullHistory
      }]);

    if (error) {
      console.error('Chyba při odesílání výsledku:', error);
    }
  }, [currentSessionId, userId]);

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
         <div className="text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em]">
           Cloud Database Active • Real-time Sync
         </div>
      </footer>
    </div>
  );
};

export default App;