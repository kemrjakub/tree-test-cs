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
    
    const newId = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, newId);
    return newId;
  });

  // 1. FUNKCE PRO NAČTENÍ A MAPOVÁNÍ DAT
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