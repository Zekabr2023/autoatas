import React, { useState, useEffect } from 'react';
import { getMinutesHistory, deleteMinute, SavedMinute } from '../services/minutesHistoryService';

interface FullMinutesHistoryViewProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (minute: SavedMinute) => void;
}

const FullMinutesHistoryView: React.FC<FullMinutesHistoryViewProps> = ({ isOpen, onClose, onSelect }) => {
    const [history, setHistory] = useState<SavedMinute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        setLoading(true);
        const data = await getMinutesHistory();
        setHistory(data);
        setLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja remover esta ata do histórico?')) {
            await deleteMinute(id);
            loadHistory();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
                        </svg>
                        Histórico de Atas Geradas
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-black/20">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-slate-500 text-sm">Nenhuma ata salva encontrada.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                            {history.map((minute) => (
                                <div
                                    key={minute.id}
                                    onClick={() => onSelect(minute)}
                                    className="group bg-white/5 border border-white/10 hover:border-brand-orange hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] relative"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden border border-white/10">
                                            {minute.condoLogo ? (
                                                <img src={minute.condoLogo} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-lg">🏢</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, minute.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                            title="Excluir"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    <h3 className="font-bold text-white text-base mb-1 line-clamp-1 group-hover:text-brand-orange transition-colors">
                                        {minute.condoName}
                                    </h3>

                                    <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
                                        <span className="text-white">
                                            {new Date(minute.timestamp).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span>{new Date(minute.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-white/5 text-[11px] text-slate-400 line-clamp-2 italic opacity-60">
                                        {((minute.minutesHtml || "").replace(/<[^>]*>/g, '').substring(0, 100)) + "..."}
                                    </div>

                                    {/* Overlay label */}
                                    <div className="absolute inset-0 bg-brand-orange/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end shrink-0">
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

export default FullMinutesHistoryView;
