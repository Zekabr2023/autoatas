
import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';
import { HistoryIcon } from './icons/HistoryIcon';

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onCondosClick: () => void;
  onHomeClick: () => void;
  onBillingClick: () => void;
  onSupportClick: () => void;
}

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHistoryClick, onCondosClick, onHomeClick, onBillingClick, onSupportClick }) => {
  const { tenant } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const getLogoStyle = () => {
    if (!tenant?.logo_style || tenant.logo_style === 'white') return 'brightness-0 invert';
    if (tenant.logo_style === 'black') return 'brightness-0';
    return ''; // original
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Get logo height with safe fallback
  const logoHeight = tenant?.logo_height || 40;

  return (
    <header className="w-full bg-slate-900/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 transition-all duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={onHomeClick} className="focus:outline-none hover:opacity-80 transition-opacity">
              <img
                src={tenant?.logo_url || "/Logotipo 444x110px.png"}
                alt={tenant?.name || "AutoAtas"}
                className={`w-auto ${getLogoStyle()}`}
                style={{ height: `${logoHeight}px`, transition: 'height 0.2s ease-out' }}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onHistoryClick}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-brand-white transition-colors"
              aria-label="Histórico de Uso"
            >
              <HistoryIcon className="w-6 h-6" />
            </button>
            <button
              onClick={onCondosClick}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-brand-white transition-colors"
              aria-label="Condomínios"
              title="Gerenciar Condomínios"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </button>
            <button
              onClick={onBillingClick}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-brand-white transition-colors"
              aria-label="Minha Assinatura"
              title="Minha Assinatura"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </button>
            <button
              onClick={onSupportClick}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-brand-white transition-colors"
              aria-label="Suporte"
              title="Suporte"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-brand-white transition-colors"
              aria-label="Configurações"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-white/20 mx-2"></div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-brand-white/70 hover:bg-white/10 hover:text-red-400 transition-colors"
              aria-label="Sair"
              title="Sair"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;