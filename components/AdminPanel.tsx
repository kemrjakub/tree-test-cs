import React, { useState, useMemo } from 'react';
import { Session, TestResult } from '../types';
import { QUESTIONS } from '../constants';
import TreeDiagram from './TreeDiagram';
import PathVisualization from './PathVisualization';

interface AdminPanelProps {
  sessions: Session[];
  activeSessionId: string | null;
  onStartSession: () => void;
  onEndSession: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ sessions, activeSessionId, onStartSession, onEndSession }) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(activeSessionId);
  const [view, setView] = useState<'results' | 'analysis' | 'viz'>('results');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | 'all'>('all');

  const selectedSession = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return null;
    return sessions.find(s => s && s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  const filteredResults = useMemo(() => {
    if (!selectedSession || !selectedSession.results) return [];
    if (selectedQuestionIndex === 'all') return selectedSession.results;
    return selectedSession.results.filter(r => r.questionIndex === selectedQuestionIndex);
  }, [selectedSession, selectedQuestionIndex]);

const stats = useMemo(() => {
    if (!selectedSession || !selectedSession.results) {
      return { users: 0, totalTasks: 0, successRate: 0 };
    }
    
    // Získáme pole všech user_id z výsledků
    const allUserIds = selectedSession.results.map((r: any) => r.user_id || r.userId);
    
    // Set vytvoří unikátní seznam (odstraní duplicity)
    const uniqueUsersCount = new Set(allUserIds.filter(id => id !== undefined)).size;
    
    const totalTasks = selectedSession.results.length;
    const successes = selectedSession.results.filter(r => {
      const q = QUESTIONS[r.questionIndex];
      return q && r.target_found === q.target;
    }).length;
    
    const rate = totalTasks > 0 ? Math.round((successes / totalTasks) * 100) : 0;
    
    return { 
      users: uniqueUsersCount, 
      totalTasks, 
      successRate: rate 
    };
  }, [selectedSession]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Akční tlačítka - primární nahoře */}
        <div className="space-y-3">
          {activeSessionId && (
            <button
              onClick={onEndSession}
              className="w-full py-4 rounded-2xl text-xs font-medium tracking-widest transition-all bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100 flex items-center justify-center gap-2 transform active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Ukončit probíhající testování
            </button>
          )}

          <button
            onClick={onStartSession}
            disabled={!!activeSessionId}
            className={`w-full py-4 rounded-2xl text-xs font-medium tracking-widest transition-all ${
              activeSessionId 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none' 
                : 'bg-[#2870ED] text-white hover:bg-blue-700 shadow-lg shadow-blue-100 transform active:scale-95'
            }`}
          >
            Zahájit nové testování
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-medium text-gray-400 tracking-widest mb-4 leading-none uppercase">Historie</h3>
          <div className="space-y-2">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                  selectedSessionId === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <div className="truncate">{s.name}</div>
                <div className={`text-[9px] mt-1 opacity-60 ${selectedSessionId === s.id ? 'text-white' : 'text-gray-400'}`}>
                  {new Date(s.createdAt).toLocaleDateString()} • {s.results.length} výsledků
                </div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="text-[10px] text-gray-400 italic py-4 text-center font-normal">
                Žádná historie testování
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9">
        {selectedSession ? (
          <>
            {/* Dashboard Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">Úspěšnost</span>
                </div>
                <div className="text-4xl font-semibold text-gray-900 leading-none">{stats.successRate}<span className="text-2xl text-blue-600 ml-1 font-normal">%</span></div>
                <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${stats.successRate}%` }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-xl">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">Uživatelé</span>
                </div>
                <div className="text-4xl font-semibold text-gray-900 leading-none">{stats.users}</div>
                <div className="mt-2 text-[10px] font-normal text-gray-400 uppercase tracking-tight">Unikátních respondentů</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">Úkoly</span>
                </div>
                <div className="text-4xl font-semibold text-gray-900 leading-none">{stats.totalTasks}</div>
                <div className="mt-2 text-[10px] font-normal text-gray-400 uppercase tracking-tight">Celkem vyřešených scénářů</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
                <button 
                  onClick={() => setView('results')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-medium tracking-widest transition-all ${view === 'results' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Výsledky
                </button>
                <button 
                  onClick={() => setView('analysis')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-medium tracking-widest transition-all ${view === 'analysis' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Analýza průchodů
                </button>
                <button 
                  onClick={() => setView('viz')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-medium tracking-widest transition-all ${view === 'viz' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Vizualizace průchodů
                </button>
              </div>

              <select
                value={selectedQuestionIndex}
                onChange={(e) => setSelectedQuestionIndex(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-white border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-medium tracking-wider outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                <option value="all">Všechny úkoly</option>
                {QUESTIONS.map((q, i) => (
                  <option key={i} value={i}>Úkol {i + 1}: {q.target}</option>
                ))}
              </select>
            </div>

            <div className="space-y-8 animate-in fade-in duration-500">
              {view === 'results' && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-8 py-5 text-[10px] font-medium text-gray-400 tracking-widest uppercase">Uživatel</th>
                        <th className="px-8 py-5 text-[10px] font-medium text-gray-400 tracking-widest uppercase">Úkol</th>
                        <th className="px-8 py-5 text-[10px] font-medium text-gray-400 tracking-widest uppercase">Výsledek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredResults.map((res, i) => {
                        const q = QUESTIONS[res.questionIndex];
                        const isCorrect = q && res.targetFound === q.target;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-8 py-5 font-mono text-[10px] text-gray-400">{res.userId}</td>
                            <td className="px-8 py-5 text-xs font-medium text-gray-800">Úkol {res.questionIndex + 1}</td>
                            <td className="px-8 py-5">
                              <span className={`px-4 py-1 rounded-full text-[10px] font-medium ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isCorrect ? 'Úspěch' : 'Chyba'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredResults.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-8 py-10 text-center text-gray-400 text-xs font-normal italic">
                            Žádná data k zobrazení
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {view === 'analysis' && (
                <TreeDiagram results={filteredResults} />
              )}

              {view === 'viz' && (
                <PathVisualization results={filteredResults} />
              )}
            </div>
          </>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border-4 border-dashed border-gray-50 text-gray-300 font-medium">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Vyberte relaci pro zobrazení dat
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;