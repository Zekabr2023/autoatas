import React, { useState, useEffect } from 'react';
import { MinutesTemplate } from '../types';

interface MeetingDetails {
    condoName: string;
    date: string;
    startTime: string;
    endTime: string;
    type: 'AGO' | 'AGE' | 'Reunião do Conselho' | 'Outra';
    president: string;
    secretary: string;
    quorum: string;
}

interface MeetingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (details: MeetingDetails) => void;
    initialData: Partial<MeetingDetails>;
}

const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({ isOpen, onClose, onConfirm, initialData }) => {
    const [formData, setFormData] = useState<MeetingDetails>({
        condoName: '',
        date: new Date().toLocaleDateString('pt-BR'),
        startTime: '',
        endTime: '',
        type: 'AGO',
        president: '',
        secretary: '',
        quorum: '',
        ...initialData
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [isOpen, initialData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const confirm = () => {
        onConfirm(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ zIndex: 9999 }}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            📝 Detalhes da Assembleia
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Confirme os dados abaixo para garantir que a ata seja gerada corretamente.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">

                    {/* Tipo de Reunião (agora ocupa toda a linha) */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Reunião</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                        >
                            <option value="AGO">AGO (Assembleia Geral Ordinária)</option>
                            <option value="AGE">AGE (Assembleia Geral Extraordinária)</option>
                            <option value="Reunião do Conselho">Reunião do Conselho</option>
                            <option value="Outra">Outra</option>
                        </select>
                    </div>

                    {/* Datas e Horários */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                            <input
                                type="text"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                                placeholder="DD/MM/AAAA"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Horário Início</label>
                            <input
                                type="text"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleInputChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                                placeholder="HH:MM"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Horário Término</label>
                            <input
                                type="text"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleInputChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                                placeholder="HH:MM"
                            />
                        </div>
                    </div>

                    {/* Mesa Diretora */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Presidente da Mesa</label>
                            <input
                                type="text"
                                name="president"
                                value={formData.president}
                                onChange={handleInputChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                                placeholder="Nome do Presidente"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Secretário(a)</label>
                            <input
                                type="text"
                                name="secretary"
                                value={formData.secretary}
                                onChange={handleInputChange}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                                placeholder="Nome do Secretário"
                            />
                        </div>
                    </div>

                    {/* Quórum */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Quórum / Presença</label>
                        <input
                            type="text"
                            name="quorum"
                            value={formData.quorum}
                            onChange={handleInputChange}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-orange/50 outline-none"
                            placeholder="Ex: 45 unidades presentes e 10 representadas por procuração"
                        />
                    </div>

                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={confirm}
                        className="px-6 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                    >
                        Confirmar e Gerar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingDetailsModal;
