import React, { useState } from 'react';
import { SavedMinute } from '../services/minutesHistoryService';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface ReadOnlyMinuteViewProps {
    minute: SavedMinute;
    isOpen: boolean;
    onClose: () => void;
    onDuplicate: (minute: SavedMinute) => void;
}

const ReadOnlyMinuteView: React.FC<ReadOnlyMinuteViewProps> = ({ minute, isOpen, onClose, onDuplicate }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const htmlContent = minute.minutesHtml || '';

    const handleCopy = () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-10 bg-black/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">{minute.condoName || 'Ata de Reunião'}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Gerada em: {new Date(minute.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all text-xs border border-white/5 active:scale-95"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            {copied ? 'Copiado!' : 'Copiar Texto'}
                        </button>
                        <button
                            onClick={() => {
                                onDuplicate(minute);
                                onClose();
                            }}
                            className="flex items-center gap-2 px-4 py-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg transition-all font-bold text-xs shadow-lg active:scale-95"
                        >
                            📝 Usar como Base
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-black/20 flex justify-center">
                    <div className="bg-white border border-slate-200 shadow-2xl p-6 sm:p-12 md:p-16 min-h-[800px] w-full max-w-[800px] transform origin-top shadow-white/5">
                        <style>{`
                            .read-only-content { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.6; color: black; text-align: justify; }
                            .read-only-content p { margin-bottom: 1em; }
                            .read-only-content strong { font-weight: bold; }
                            .read-only-content ul, .read-only-content ol { margin-left: 20px; }
                            .minutes-header { border: 1px solid black; border-collapse: collapse; width: 100%; margin-bottom: 2rem; font-family: 'Arial', sans-serif; font-size: 10pt; color: black; }
                            .minutes-header td { border: 1px solid black; padding: 8px; text-align: center; vertical-align: middle; color: black; }
                        `}</style>

                        {/* Simulated Header */}
                        <table className="minutes-header">
                            <colgroup>
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '15%' }} />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td rowSpan={2}>
                                        {minute.condoLogo && (
                                            <img src={minute.condoLogo} alt="Logo" className="w-12 h-12 object-contain mx-auto" />
                                        )}
                                    </td>
                                    <td rowSpan={2}>
                                        <strong>ATA DA ASSEMBLEIA<br />GERAL ORDINÁRIA<br />VIRTUAL</strong>
                                    </td>
                                    <td rowSpan={2}>
                                        {minute.condoName ? minute.condoName.toUpperCase() : "CONDOMÍNIO"}
                                    </td>
                                    <td>DATA:<br />{minute.meetingDate || new Date(minute.timestamp).toLocaleDateString('pt-BR')}</td>
                                    <td>Pág: 1/1</td>
                                    <td className="text-[8px] font-bold">BAIXE SEU<br />APP AQUI</td>
                                </tr>
                                <tr>
                                    <td>Início: {minute.meetingStartTime || '19:30'}<br />Término: {minute.meetingEndTime || '21:00'}</td>
                                    <td>AGO<br />{new Date(minute.timestamp).getFullYear()}</td>
                                    <td className="text-[8px] font-bold tracking-tighter">QR CODE</td>
                                </tr>
                            </tbody>
                        </table>
                        <div
                            className="read-only-content"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadOnlyMinuteView;
