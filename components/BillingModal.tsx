import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface BillingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
    const { tenant } = useTheme();

    // Mock Invoices
    const invoices = [
        { id: '1', date: '01/12/2023', amount: 'R$ 299,00', status: 'Pago' },
        { id: '2', date: '01/11/2023', amount: 'R$ 299,00', status: 'Pago' },
        { id: '3', date: '01/10/2023', amount: 'R$ 299,00', status: 'Pago' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Minha Assinatura
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Current Plan Card */}
                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Plano Atual</h3>
                            <div className="text-2xl font-bold text-brand-orange mb-1">
                                {tenant?.plan_tier === 'pro' ? 'Profissional' : 'Essencial'}
                            </div>
                            <p className="text-slate-400 text-sm mb-4">
                                {tenant?.plan_status === 'active' ? 'Ativo • Renova em 01/02/2026' : 'Status: ' + (tenant?.plan_status || 'Inativo')}
                            </p>
                            <button className="text-xs font-bold py-2 px-4 border border-brand-orange/50 text-brand-orange rounded-lg hover:bg-brand-orange hover:text-white transition-all w-full">
                                Mudar de Plano
                            </button>
                        </div>

                        {/* Payment Method Card */}
                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Pagamento</h3>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-md border border-white/10">VISA</div>
                                <span className="text-white font-medium text-sm">•••• 4242</span>
                            </div>
                            <button className="text-xs text-brand-orange hover:underline font-bold transition-all">
                                Atualizar cartão
                            </button>
                        </div>
                    </div>

                    {/* Usage Progress */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-xl mb-8">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Uso do Período</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-300">Minutos Transcritos</span>
                                    <span className="text-white font-bold">120 / 300</span>
                                </div>
                                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-brand-orange rounded-full shadow-[0_0_10px_rgba(242,118,73,0.3)] transition-all duration-1000" style={{ width: '40%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-300">Atas Geradas</span>
                                    <span className="text-white font-bold">5 / 20</span>
                                </div>
                                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000" style={{ width: '25%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <h3 className="text-sm font-bold text-white mb-4">Faturas Recentes</h3>
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-400 text-[10px] uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Valor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">{inv.date}</td>
                                        <td className="px-4 py-3">{inv.amount}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-slate-500 hover:text-white transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 border border-brand-orange/20"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillingModal;
