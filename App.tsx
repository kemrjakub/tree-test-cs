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
  
  // Zajištění unikátního ID pro každé zařízení/prohlížeč
  const [userId] = useState(() => {
    const storageKey = 'tree_test_unique_user_id';
    const saved = localStorage.getItem(storageKey);
    if (saved && saved.startsWith('user_')) return saved;
    
    // Vygenerujeme skutečně náhodné ID
    const newId = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, newId);
    return newId;
  });

  // 1. FUNKCE PRO NAČTENÍ A MAPOVÁNÍ DAT
  const loadDataFromSupabase = useCallback(async () => {
    // Načteme sessions a k nim připojené results
    const { data, error } = await supabase
      .from('sessions')
      .select('*, results(*)');

    if (error) {
      console.error("Chyba při komunikaci se Supabase:", error.message);
      return;
    }

    if (data) {
      // Důležité: Mapování názvů z DB (snake_case) na TypeScript (camelCase)
      const formatted: Session[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        createdAt: new Date(s.created_at).getTime(),
        isActive: s.is_active, // <--- Zde probíhá ten důležitý překlad
        isCompleted: !s.is_active,
        results: Array.isArray(s.results) ? s.results : []
      }));
      
      setSessions(formatted);
      
      // Hledáme relaci, která je aktuálně aktivní
      const active = formatted.find(s => s.isActive === true);
      if (active) {
        setCurrentSessionId(active.id);
      } else {
        setCurrentSessionId(null);
      }
    }
  }, []);

  // 2. USEEFFECT PRO INICIALIZACI A REALTIME ODBĚR
  useEffect(() => {
    loadDataFromSupabase();

    // Přihlášení k odběru změn v databázi (Realtime)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        () => loadDataFromSupabase()
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'results' }, 
        () => loadDataFromSupabase()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDataFromSupabase]);

  // 3. LOGIKA PRO START NOVÉHO TESTOVÁNÍ
  const startNewSession = useCallback(async () => {
    const timestamp = Date.now();
    const sessionName = prompt('Zadejte název relace (např. Workshop IT):', `Relace ${new Date(timestamp).toLocaleDateString()}`);
    
    if (!sessionName) return;

    // Nejdříve pro jistotu ukončíme všechny ostatní aktivní relace
    await supabase.from('sessions').update({ is_active: false }).eq('is_active', true);

    // Vložíme novou relaci
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ name: sessionName, is_active: true }])
      .select()
      .single();

    if (error) {
      alert('Nepodařilo se vytvořit relaci v databázi.');
    } else if (data) {
      setCurrentSessionId(data.id);
      setMode(AppMode.STUDENT);
    }
  }, []);

  // 4. UKONČENÍ TESTOVÁNÍ
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

  // 5. ODESLÁNÍ VÝSLEDKU OD STUDENTA
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
      console.error('Výsledek se nepodařilo uložit do cloudu:', error);
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
         <div className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
           <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
           Cloud Database Connected • Real-time Sync Active
         </div>
      </footer>
    </div>
  );
};

export default App;