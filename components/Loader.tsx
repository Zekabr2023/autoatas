
import React from 'react';
import { AppState } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoaderProps {
  message: string;
  stage: AppState.TRANSCRIBING | AppState.GENERATING;
  progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ message, stage, progress = 0 }) => {
  const showProgress = progress > 0 && progress < 100;
  const secondaryColor = 'var(--color-secondary)';

  return (
    <div className="w-full max-w-2xl flex flex-col items-center justify-center text-center p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl animate-fade-in">
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        <div className="absolute w-full h-full rounded-full border-4 border-white/20"></div>
        <div
          className="absolute w-full h-full rounded-full border-4 border-transparent border-t-current animate-spin"
          style={{ color: secondaryColor }}
        ></div>
        {stage === AppState.GENERATING ? (
          <SparklesIcon className="w-10 h-10" style={{ color: secondaryColor }} />
        ) : (
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: secondaryColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
          </svg>
        )}
      </div>
      <p className="text-lg font-semibold text-white">{message}</p>

      {showProgress && (
        <div className="w-full mt-6 max-w-md">
          <div className="flex justify-between text-sm text-white/80 mb-2">
            <span>Progresso da conversão</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)]"
              style={{ width: `${progress}%`, backgroundColor: secondaryColor }}
            ></div>
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-white/80">Por favor, não feche esta janela.</p>
    </div>
  );
};

export default Loader;