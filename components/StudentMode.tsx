import React, { useState, useMemo } from 'react';
import { Session, TestResult, CategoryNode } from '../types';
import { QUESTIONS } from '../constants';
import { categoryData } from '../data/categoryTree';

interface StudentModeProps {
  userId: string;
  activeSession: Session | null;
  onSubmitResult: (result: TestResult) => void;
}

const StudentMode: React.FC<StudentModeProps> = ({ userId, activeSession, onSubmitResult }) => {
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [fullHistory, setFullHistory] = useState<string[]>(["Obchod"]);
  const [currentNode, setCurrentNode] = useState<CategoryNode>(categoryData);
  const [isFinished, setIsFinished] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  const userResultsCount = useMemo(() => {
    if (!activeSession || !Array.isArray(activeSession.results)) return 0;
    return activeSession.results.filter(r => r && r.userId === userId).length;
  }, [activeSession, userId]);

  const isUserDone = userResultsCount >= QUESTIONS.length;

  const handleStart = () => setTestStarted(true);

  const handleCategoryClick = (node: CategoryNode) => {
    const newPath = [...currentPath, node.name];
    setCurrentPath(newPath);
    setFullHistory(prev => [...prev, node.name]);
    if (node.children) {
      setCurrentNode(node);
    }
  };

  const handleBack = () => {
    if (pendingSelection) {
      setPendingSelection(null);
      setFullHistory(prev => [...prev, currentPath[currentPath.length - 1] || "Obchod"]);
      return;
    }
    if (currentPath.length === 0) return;
    
    const newPath = [...currentPath];
    newPath.pop();
    setCurrentPath(newPath);
    
    const targetNodeName = newPath.length > 0 ? newPath[newPath.length - 1] : "Obchod";
    setFullHistory(prev => [...prev, targetNodeName]);
    
    let node = categoryData;
    for (const step of newPath) {
      const next = node.children?.find(c => c.name === step);
      if (next) node = next;
    }
    setCurrentNode(node);
  };

  const navigateToLevel = (idx: number) => {
    if (pendingSelection) return;
    
    const newPath = currentPath.slice(0, idx + 1);
    setCurrentPath(newPath);
    setFullHistory(prev => [...prev, newPath[newPath.length - 1]]);
    
    let node = categoryData;
    for (const step of newPath) {
      const next = node.children?.find(c => c.name === step);
      if (next) node = next;
    }
    setCurrentNode(node);
  };

  const handleConfirmSelection = () => {
    if (!pendingSelection) return;
    
    const finalPath = [...currentPath, pendingSelection];
    const result: TestResult = {
      userId,
      questionIndex: currentQuestionIndex,
      path: finalPath,
      fullHistory: [...fullHistory, pendingSelection],
      targetFound: pendingSelection,
      timestamp: Date.now()
    };
    onSubmitResult(result);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentPath([]);
      setFullHistory(["Obchod"]);
      setCurrentNode(categoryData);
      setPendingSelection(null);
    } else {
      setIsFinished(true);
    }
  };

  if (!activeSession) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-full text-center mt-20 bg-white p-12 rounded-2xl material-shadow border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-medium mb-4 text-gray-900 leading-tight">V současné chvíli neprobíhá žádné testování</h2>
          <p className="text-gray-400 font-normal text-sm leading-relaxed">
            Až administrátor spustí test, zobrazí se tlačítko <br />"Spustit"
          </p>
        </div>
      </div>
    );
  }

  if (isUserDone || isFinished) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 bg-white p-12 rounded-2xl material-shadow border border-gray-100 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-medium mb-3 text-gray-900">Testování dokončeno!</h2>
        <p className="text-gray-500 font-normal">Děkujeme za vaši účast. Počkejte na vyhodnocení výsledků školitelem.</p>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-full bg-white p-12 rounded-2xl material-shadow text-center mt-20 border border-gray-100">
          <h2 className="text-3xl font-medium mb-6 text-gray-900 tracking-tight">Tree testing</h2>
          <p className="text-gray-500 mb-10 text-sm leading-relaxed font-normal">
            V tomto testu budete hledat konkrétní položky ve stromové struktuře kategorií.
            Snažte se klikat co nejpřesněji tam, kde byste danou věc přirozeně očekávali.
          </p>
          <button 
            onClick={handleStart}
            className="w-full bg-[#2870ED] text-white py-5 rounded-2xl font-medium text-lg hover:bg-[#1e5bc4] transition-all material-shadow transform hover:scale-[1.02] active:scale-95"
          >
            Spustit
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-blue-50 border-l-8 border-[#2870ED] p-8 rounded-r-2xl material-shadow">
        <h3 className="text-2xl font-medium text-gray-900 leading-tight">
          <span className="text-[#2870ED] opacity-40 mr-4 font-semibold">{currentQuestionIndex + 1}/{QUESTIONS.length}</span>
          {currentQuestion.text}
        </h3>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-xl material-shadow border border-gray-100">
        <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-gray-500 items-center pl-2">
          <button 
            onClick={() => { if (!pendingSelection) { setCurrentPath([]); setCurrentNode(categoryData); setFullHistory(prev => [...prev, "Obchod"]); } }}
            className={`font-normal transition-all ${pendingSelection ? 'text-gray-300 cursor-not-allowed' : 'text-[#2870ED] hover:underline'}`}
          >
            Obchod
          </button>
          {currentPath.map((step, idx) => (
            <React.Fragment key={idx}>
              <span className="text-gray-300 font-normal px-0.5">/</span>
              <button 
                onClick={() => navigateToLevel(idx)}
                className={`font-normal transition-all ${pendingSelection ? 'text-gray-300 cursor-not-allowed' : idx === currentPath.length - 1 ? 'text-gray-600' : 'text-[#2870ED] hover:underline'}`}
              >
                {step}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {(currentPath.length > 0 || pendingSelection) && (
          <button 
            onClick={handleBack}
            className="border-2 border-[#2870ED] text-[#2870ED] bg-transparent px-5 py-2 rounded-xl text-xs font-medium flex items-center hover:bg-blue-50 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Zpět
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl material-shadow overflow-hidden flex flex-col relative border border-gray-100 h-auto">
        {pendingSelection ? (
          <div className="p-16 text-center flex flex-col items-center justify-center flex-grow space-y-8 animate-in fade-in duration-300 pb-32">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">Právě jste označili položku</div>
            <div className="text-4xl sm:text-5xl font-medium text-gray-900 break-words max-w-full leading-none tracking-tight">{pendingSelection}</div>
            <p className="text-gray-500 text-sm max-w-sm font-normal leading-relaxed">
              Pokud je to vaše finální volba, potvrďte ji tlačítkem níže.
            </p>
            <div className="absolute bottom-6 left-0 right-0 px-10">
              <button
                onClick={handleConfirmSelection}
                className="w-full bg-[#2870ED] text-white py-4 rounded-2xl font-medium text-lg hover:bg-[#1e5bc4] transition-all material-shadow transform hover:scale-[1.01] active:scale-95 shadow-xl shadow-blue-100"
              >
                {currentQuestionIndex === QUESTIONS.length - 1 ? 'Ukončit testování' : 'Další úkol'}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 flex-grow overflow-y-auto pt-2">
            {currentNode.children?.map((child) => (
              <button
                key={child.name}
                onClick={() => child.children ? handleCategoryClick(child) : setPendingSelection(child.name)}
                className="w-full text-left px-10 py-3 hover:bg-blue-50/50 transition-all flex justify-between items-center group active:bg-blue-100/50"
              >
                <span className="font-medium text-gray-800 text-lg group-hover:text-[#2870ED] transition-colors tracking-tight">{child.name}</span>
                <div className="bg-gray-100 group-hover:bg-[#2870ED] p-1.5 rounded-xl transition-all transform group-hover:translate-x-2">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMode;