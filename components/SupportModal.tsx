import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const { tenant } = useTheme();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('support_tickets').insert({
                tenant_id: tenant?.id,
                subject,
                description,
                status: 'open'
            });

            if (error) throw error;
            setSuccess(true);
            setSubject('');
            setDescription('');
        } catch (error) {
            console.error('Error submitting ticket:', error);
            alert('Erro ao enviar ticket. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Suporte Técnico
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {success ? (
                        <div className="text-center py-12 animate-fade-in">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Ticket Enviado!</h3>
                            <p className="text-slate-400 mb-8 max-w-sm mx-auto">Nossa equipe recebeu sua solicitação e entrará em contato em breve através do seu e-mail.</p>
                            <button
                                onClick={() => setSuccess(false)}
                                className="px-8 py-3 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                            >
                                Enviar Novo Ticket
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Assunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-2 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all text-white placeholder-slate-500"
                                    placeholder="Ex: Erro ao gerar ata de condomínio"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">Descrição do Problema</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-2 border border-white/10 bg-black/40 rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all text-white placeholder-slate-500 resize-none"
                                    placeholder="Descreva detalhadamente o que está ocorrendo..."
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border border-brand-orange/20"
                                >
                                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportModal;
