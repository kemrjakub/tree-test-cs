import React from 'react';
import { AppMode } from '../types';

interface NavigationProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isActiveSession: boolean;
  isAdminAuthenticated: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ mode, setMode, isActiveSession, isAdminAuthenticated }) => {
  
  const goToHome = () => {
    setMode(AppMode.STUDENT);
  };

  return (
    <nav className="bg-[#2870ED] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand sekce */}
        <div className="flex items-center">
          <button 
            onClick={goToHome}
            className="font-semibold text-xl tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
          >
            TreeTest ČS
          </button>
        </div>

        <div className="flex space-x-2 items-center">
          {/* Tlačítko Administrace - zobrazuje se studentovi */}
          {mode === AppMode.STUDENT && (
            <button 
              type="button"
              onClick={() => setMode(AppMode.ADMIN)}
              className="bg-[#1e5bc4] hover:bg-[#1649a1] px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md flex items-center cursor-pointer"
            >
              Administrace
            </button>
          )}

          {/* Tlačítko Zpět do testu - zobrazuje se v admin módu, pokud běží test */}
          {mode === AppMode.ADMIN && isActiveSession && (
            <button 
              type="button"
              onClick={() => setMode(AppMode.STUDENT)}
              className="bg-white/20 hover:bg-white/30 px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md flex items-center cursor-pointer"
            >
              Zpět do testu
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;