import React, { useState } from 'react';
import { ADMIN_PASSWORD } from '../constants';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLoginSuccess();
    } else {
      setError('Nesprávné heslo. Zkuste to prosím znovu.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white p-12 rounded-3xl material-shadow border border-gray-100 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-[#2870ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">Administrace</h2>
        <p className="text-gray-400 font-medium text-xs mb-10 uppercase tracking-widest">Vstup je povolen pouze školitelům</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-[11px] font-semibold text-gray-400 mb-2 ml-1 uppercase tracking-wider">Zadejte heslo</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-medium text-lg focus:border-[#2870ED] focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              placeholder="••••••••••••"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs font-semibold mt-3 ml-1 animate-pulse">{error}</p>}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-[#2870ED] text-white py-5 rounded-2xl font-semibold text-lg hover:bg-[#1e5bc4] transition-all material-shadow transform active:scale-95 shadow-xl shadow-blue-100"
          >
            Přihlásit se
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;