import React, { useEffect, useState } from 'react';
import { getMinutesHistory, SavedMinute, deleteMinute } from '../services/minutesHistoryService';

interface RecentMinutesProps {
    onSelect: (minute: SavedMinute) => void;
    onViewAll: () => void;
}

const RecentMinutes: React.FC<RecentMinutesProps> = ({ onSelect, onViewAll }) => {
    const [history, setHistory] = useState<SavedMinute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

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

    if (loading) return (
        <div className="w-full max-w-2xl mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50"></div>
        </div>
    );

    if (history.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mt-8 animate-fade-in">
            <div className="flex justify-between items-center mb-3 pl-1 pr-1">
                <h3 className="text-sm font-semibold text-brand-white/80 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Histórico Recente
                </h3>
                <button
                    onClick={onViewAll}
                    className="text-xs text-brand-white/60 hover:text-brand-white hover:underline transition-all"
                >
                    Ver todas
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {history.slice(0, 4).map((minute) => ( // Show last 4
                    <div
                        key={minute.id}
                        onClick={() => onSelect(minute)}
                        className="group relative bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-brand-orange/50 rounded-lg p-3 cursor-pointer transition-all duration-200"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="text-brand-white font-medium truncate">
                                    {minute.condoName}
                                </p>
                                <p className="text-xs text-brand-white/60">
                                    {new Date(minute.timestamp).toLocaleDateString('pt-BR', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                                {minute.fileName && (
                                    <p className="text-[10px] text-brand-white/40 truncate mt-1">
                                        📄 {minute.fileName}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, minute.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                                title="Remover"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentMinutes;
