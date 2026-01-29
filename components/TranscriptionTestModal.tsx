import React, { useState } from 'react';

interface TranscriptionTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (transcription: string) => void;
    isLoading: boolean;
}

export default function TranscriptionTestModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading
}: TranscriptionTestModalProps) {
    const [transcription, setTranscription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (transcription.trim()) {
            onSubmit(transcription.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">
                            🧪 Testar Geração de Ata
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Cole uma transcrição abaixo para testar diretamente a geração de ata pela IA.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-hidden">
                    <textarea
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        placeholder="Cole aqui a transcrição da reunião...

Exemplo:
Orador 1: Boa noite a todos, vamos dar início à nossa assembleia.
Orador 2: Gostaria de propor a aprovação das contas do último trimestre.
Orador 1: Alguém tem alguma objeção? Caso contrário, considero aprovado.
..."
                        className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:border-brand-orange transition-colors text-slate-800 placeholder-slate-400"
                        disabled={isLoading}
                    />

                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                        <span>
                            {transcription.length > 0 && `${transcription.length} caracteres`}
                        </span>
                        <span>
                            Dica: Quanto mais detalhada a transcrição, melhor será a ata gerada.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!transcription.trim() || isLoading}
                        className="px-6 py-2.5 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand-orange/20"
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Gerando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Gerar Ata
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
