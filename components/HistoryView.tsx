import React, { useState, useEffect } from 'react';
import { getTokenHistory, clearTokenHistory, groupTokenUsage } from '../services/tokenService';
import { TokenUsage } from '../types';

interface HistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  onViewMinute?: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ isOpen, onClose, onViewMinute }) => {
  const [history, setHistory] = useState<Record<string, TokenUsage>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistory(groupTokenUsage(getTokenHistory()));
    }
  }, [isOpen]);

  const calculateDuration = (tokens: number): string => {
    if (!tokens) return '0 min';
    const seconds = tokens / 32;
    if (seconds < 60) return `${Math.ceil(seconds)} seg`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  };

  const handleClearHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
      clearTokenHistory();
      setHistory({});
    }
  };

  const sessionIds = Object.keys(history).filter(id => {
    const item = history[id];
    const date = new Date(item.timestamp);
    const name = item.condoName || "Sessão da Assembleia";

    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && date >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && date <= end;
    }

    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    const dateA = new Date(history[a].timestamp).getTime();
    const dateB = new Date(history[b].timestamp).getTime();
    return dateB - dateA;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-transparent shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Histórico de Uso
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Créditos consumidos e atas geradas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex flex-wrap gap-3 items-end shrink-0">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Filtrar Condomínio</label>
            <input
              type="text"
              placeholder="Ex: Edifício Solar..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-orange/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Data De</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Até</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(searchTerm || startDate || endDate) && (
            <button
              onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-black/20">
          {sessionIds.length > 0 ? (
            <div className="space-y-4">
              {sessionIds.map(sessionId => {
                const item = history[sessionId];
                const transUsage = item.transcriptionUsage;
                const genUsage = item.generationUsage;
                const totalTokens = (transUsage?.promptTokenCount || 0) + (transUsage?.candidatesTokenCount || 0) +
                  (genUsage?.promptTokenCount || 0) + (genUsage?.candidatesTokenCount || 0);

                const inputTokens = transUsage?.promptTokenCount || 0;
                const meetingTimeFormatted = calculateDuration(inputTokens);

                return (
                  <div key={sessionId} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-brand-orange/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-white text-lg group-hover:text-brand-orange transition-colors">
                          {item.condoName || "Sessão da Assembleia"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">#{sessionId.split('_')[1]} • {new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2">
                        {item.minuteId && onViewMinute && (
                          <button
                            onClick={() => onViewMinute(item.minuteId!)}
                            className="bg-brand-orange text-white text-[10px] font-bold px-3 py-1 rounded-lg hover:bg-brand-orange-dark transition-all shadow-lg active:scale-95"
                          >
                            VER ATA
                          </button>
                        )}
                        <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-3 py-1 rounded-lg border border-green-500/20 uppercase tracking-wider">
                          Sucesso
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Duração</p>
                        <p className="text-white font-mono text-sm">{meetingTimeFormatted}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Transcrição</p>
                        <p className="text-white font-mono text-sm">{transUsage?.promptTokenCount.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-600 uppercase">tokens</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Geração</p>
                        <p className="text-white font-mono text-sm">{genUsage?.promptTokenCount.toLocaleString('pt-BR') || 0} <span className="text-[10px] text-slate-600 uppercase">tokens</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1 whitespace-nowrap">Investimento Total</p>
                        <p className="text-brand-orange font-mono font-black text-sm">{totalTokens.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Nenhum registro de uso encontrado.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex justify-between items-center bg-transparent shrink-0">
          <button
            onClick={handleClearHistory}
            className="text-xs font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            Limpar Todo Histórico
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 border border-brand-orange/20"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
