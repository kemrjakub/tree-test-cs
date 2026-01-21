import React, { useState, useMemo } from 'react';
import { Session } from '../types';
import { QUESTIONS } from '../constants';
import TreeDiagram from './TreeDiagram';
import PathVisualization from './PathVisualization';

interface AdminPanelProps {
  sessions: Session[];
  activeSessionId: string | null;
  onStartSession: () => void;
  onEndSession: () => void;
  onDeleteSession: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  sessions, 
  activeSessionId, 
  onStartSession, 
  onEndSession,
  onDeleteSession 
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(activeSessionId);
  const [view, setView] = useState<'results' | 'analysis' | 'viz'>('results');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | 'all'>('all');

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  const filteredResults = useMemo(() => {
    if (!selectedSession || !selectedSession.results) return [];
    if (selectedQuestionIndex === 'all') return selectedSession.results;
    return selectedSession.results.filter(r => r.questionIndex === selectedQuestionIndex);
  }, [selectedSession, selectedQuestionIndex]);

  const stats = useMemo(() => {
    if (!selectedSession || !selectedSession.results) return { users: 0, totalTasks: 0, successRate: 0 };
    
    const results = selectedSession.results;
    const uniqueUsers = new Set(results.map(r => r.userId)).size;
    const totalTasks = results.length;
    const successes = results.filter(r => {
      const q = QUESTIONS[r.questionIndex];
      return q && r.targetFound === q.target;
    }).length;
    
    return { 
      users: uniqueUsers, 
      totalTasks, 
      successRate: totalTasks > 0 ? Math.round((successes / totalTasks) * 100) : 0 
    };
  }, [selectedSession]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-xs font-bold uppercase tracking-widest">
          <h3 className="text-gray-400 mb-4">Relace</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="group relative flex items-center">
                <button
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all pr-10 ${
                    selectedSessionId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.name}
                </button>
                
                {/* Tlačítko pro smazání */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(s.id);
                  }}
                  className={`absolute right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                    selectedSessionId === s.id ? 'text-white/70 hover:text-white' : 'text-gray-300 hover:text-red-500'
                  }`}
                  title="Smazat relaci"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={activeSessionId ? onEndSession : onStartSession}
            className={`w-full mt-6 py-4 rounded-2xl text-white ${
              activeSessionId ? 'bg-red-50 text-red-600' : 'bg-blue-600'
            }`}
          >
            {activeSessionId ? 'Ukončit test' : 'Nová relace'}
          </button>
        </div>

        {selectedSession && (
          <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl">
            <div className="text-3xl font-black mb-1">{stats.successRate}%</div>
            <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-6">Úspěšnost</div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/5 p-3 rounded-2xl">
                <div className="text-xl font-black">{stats.users}</div>
                <div className="text-[8px] font-black text-gray-500 uppercase">Lidí</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl">
                <div className="text-xl font-black">{stats.totalTasks}</div>
                <div className="text-[8px] font-black text-gray-500 uppercase">Úkolů</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-9">
        {selectedSession ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
                {['results', 'analysis', 'viz'].map((v: any) => (
                  <button 
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${view === v ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    {v === 'results' ? 'VÝSLEDKY' : v === 'analysis' ? 'ANALÝZA' : 'FLOW'}
                  </button>
                ))}
              </div>

              <select
                value={selectedQuestionIndex}
                onChange={(e) => setSelectedQuestionIndex(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white border border-gray-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider outline-none shadow-sm"
              >
                <option value="all">Všechny úkoly</option>
                {QUESTIONS.map((q, i) => (
                  <option key={i} value={i}>Úkol {