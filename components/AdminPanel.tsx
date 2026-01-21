import React, { useState, useMemo } from 'react';
import { Session } from '../types';
import { QUESTIONS } from '../constants';
import TreeDiagram from './TreeDiagram';
import PathVisualization from './PathVisualization';
import PathMap from './PathMap'; // IMPORT NOVÉHO KOMPONENTU

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
  // Rozšířeno o stav 'map'
  const [view, setView] = useState<'results' | 'analysis' | 'viz' | 'map'>('results');
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
      const found = r.targetFound || r.target_found;
      return q && found === q.target;
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
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Relace</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="group relative flex items-center">
                <button
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-[11px] font-black transition-all pr-10 ${
                    selectedSessionId === s.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.name}
                </button>
                
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
            className={`w-full mt-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeSessionId ? 'bg-red-50 text-red-600' : 'bg-[#2870ED] text-white shadow-lg'
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
                <div className="text-[8px] font-black text-gray-500 uppercase">Úkoly</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-9">
        {selectedSession ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit overflow-x-auto">
                {['results', 'analysis', 'viz', 'map'].map((v: any) => (
                  <button 
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${view === v ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    {v === 'results' ? 'VÝSLEDKY' : v === 'analysis' ? 'STROM' : v === 'viz' ? 'PRŮCHODY' : 'VIZUALIZACE'}
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
                  <option key={i} value={i}>Úkol {i + 1}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {view === 'results' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-4">Respondent</th>
                        <th className="px-8 py-4">Úkol</th>
                        <th className="px-8 py-4 text-right">Stav</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-[11px]">
                      {filteredResults.map((res: any, i) => {
                        const q = QUESTIONS[res.questionIndex];
                        const found = res.targetFound || res.target_found;
                        const isCorrect = q && found === q.target;
                        return (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-4 font-mono text-gray-400">{res.userId}</td>
                            <td className="px-8 py-4 font-black text-gray-800 uppercase tracking-tight">
                               Úkol {typeof res.questionIndex === 'number' ? res.questionIndex + 1 : '?'}
                            </td>
                            <td className="px-8 py-4 text-right">
                              <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isCorrect ? 'Úspěch' : 'Chyba'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {view === 'analysis' && <TreeDiagram results={filteredResults} />}
              {view === 'viz' && <PathVisualization results={filteredResults} />}
              {view === 'map' && <PathMap results={filteredResults} />}
            </div>
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border-4 border-dashed border-gray-50 text-gray-300 font-black uppercase tracking-widest">
            Vyberte relaci pro zobrazení dat
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;