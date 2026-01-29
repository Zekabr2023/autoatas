import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface Condo {
    id: string;
    nome: string;
    cnpj: string;
    telefone: string;
    endereco: string;
    cep: string;
    responsavel: string;
    email: string;
    logotipo_url: string | null;
    presidente: string;
    secretario: string;
}

interface CondoManagerProps {
    onSelect?: (condo: Condo) => void;
    onClose?: () => void;
}

export default function CondoManager({ onSelect, onClose }: CondoManagerProps) {
    const [condos, setCondos] = useState<Condo[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        nome: '',
        cnpj: '',
        telefone: '',
        endereco: '',
        cep: '',
        responsavel: '',
        email: '',
        presidente: '',
        secretario: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchCondos();
    }, []);

    const fetchCondos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('condominios')
                .select('*')
                .order('nome', { ascending: true }); // Alphabetical is better for lists

            if (error) throw error;
            setCondos(data || []);
        } catch (err: any) {
            console.error('Error fetching condos:', err);
            setError('Erro ao carregar condomínios.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const uploadLogo = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading logo:', error);
            return null;
        }
    };

    const handleEdit = (condo: Condo) => {
        setFormData({
            nome: condo.nome || '',
            cnpj: condo.cnpj || '',
            telefone: condo.telefone || '',
            endereco: condo.endereco || '',
            cep: condo.cep || '',
            responsavel: condo.responsavel || '',
            email: condo.email || '',
            presidente: condo.presidente || '',
            secretario: condo.secretario || ''
        });
        setCurrentLogoUrl(condo.logotipo_url);
        setEditingId(condo.id);
        setView('edit');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este condomínio? Esta ação não pode ser desfeita.')) return;

        try {
            const { error: deleteError } = await supabase
                .from('condominios')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            await fetchCondos();
        } catch (err: any) {
            console.error('Error deleting condo:', err);
            alert('Erro ao excluir condomínio: ' + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setError('');

        try {
            let logoUrl = currentLogoUrl;
            if (logoFile) {
                logoUrl = await uploadLogo(logoFile);
            }

            if (view === 'edit' && editingId) {
                const { error: updateError } = await supabase
                    .from('condominios')
                    .update({
                        ...formData,
                        logotipo_url: logoUrl
                    })
                    .eq('id', editingId);

                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('condominios')
                    .insert([{
                        ...formData,
                        logotipo_url: logoUrl
                    }]);

                if (insertError) throw insertError;
            }

            await fetchCondos();
            resetForm();
        } catch (err: any) {
            console.error('Error saving condo:', err);
            setError('Erro ao salvar condomínio: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setView('list');
        setFormData({
            nome: '',
            cnpj: '',
            telefone: '',
            endereco: '',
            cep: '',
            responsavel: '',
            email: '',
            presidente: '',
            secretario: ''
        });
        setLogoFile(null);
        setCurrentLogoUrl(null);
        setEditingId(null);
    };

    return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-transparent shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {view === 'list' ? 'Condomínios Cadastrados' : view === 'edit' ? 'Editar Condomínio' : 'Novo Condomínio'}
                </h2>
                <div className="flex gap-2 items-center">
                    {(view === 'create' || view === 'edit') && (
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-xs bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors border border-white/10"
                        >
                            Voltar para Lista
                        </button>
                    )}
                    {view === 'list' && (
                        <button
                            onClick={() => setView('create')}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 text-xs"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Novo
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {error && (
                    <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl mb-6 flex items-center gap-3 animate-fade-in">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {view === 'list' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mx-auto mb-2"></div>
                                <p className="text-sm">Carregando condomínios...</p>
                            </div>
                        ) : condos.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-slate-400 text-sm">Nenhum condomínio cadastrado.</p>
                            </div>
                        ) : (
                            condos.map((condo) => (
                                <div
                                    key={condo.id}
                                    className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 hover:border-brand-orange/50 transition-all group relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10 shadow-inner">
                                            {condo.logotipo_url ? (
                                                <img src={condo.logotipo_url} alt={condo.nome} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base leading-tight truncate">{condo.nome}</h3>
                                            <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase truncate">{condo.cnpj || 'SEM CNPJ'}</p>
                                        </div>

                                        {/* Action Buttons (Top Right) */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(condo); }}
                                                className="p-1.5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, condo.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-xs text-slate-400">
                                        {condo.responsavel && <p className="truncate"><span className="text-slate-600 font-bold uppercase mr-1">Síndico:</span> {condo.responsavel}</p>}
                                        {condo.presidente && <p className="truncate"><span className="text-slate-600 font-bold uppercase mr-1">Presidente:</span> {condo.presidente}</p>}
                                        {condo.secretario && <p className="truncate"><span className="text-slate-600 font-bold uppercase mr-1">Secretário:</span> {condo.secretario}</p>}
                                        {condo.endereco && <p className="truncate"><span className="text-slate-600 font-bold uppercase mr-1">Local:</span> {condo.endereco}</p>}
                                    </div>

                                    {/* Selection Button (Bottom Right) */}
                                    {onSelect && (
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => onSelect(condo)}
                                                className="bg-brand-orange hover:bg-brand-orange-dark text-white text-[10px] font-bold px-4 py-1.5 rounded-lg shadow-lg border border-white/10 transition-all active:scale-95"
                                            >
                                                Selecionar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Condomínio</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="Ex: Edifício Solar"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
                                <input
                                    type="text"
                                    name="cnpj"
                                    value={formData.cnpj}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável / Síndico</label>
                                <input
                                    type="text"
                                    name="responsavel"
                                    value={formData.responsavel}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="Nome do responsável"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="contato@condominio.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">CEP</label>
                                <input
                                    type="text"
                                    name="cep"
                                    value={formData.cep}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="00000-000"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço Completo</label>
                                <input
                                    type="text"
                                    name="endereco"
                                    value={formData.endereco}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Presidente da Mesa (padrão)</label>
                                <input
                                    type="text"
                                    name="presidente"
                                    value={formData.presidente}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="Nome do Presidente"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Secretário(a) (padrão)</label>
                                <input
                                    type="text"
                                    name="secretario"
                                    value={formData.secretario}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange outline-none transition-all"
                                    placeholder="Nome do Secretário"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Logotipo do Condomínio</label>
                                <div className="flex items-center gap-4 bg-black/40 p-4 rounded-lg border border-white/10">
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                        />
                                    </div>
                                    {currentLogoUrl && !logoFile && (
                                        <div className="w-10 h-10 rounded border border-white/10 overflow-hidden bg-black/20">
                                            <img src={currentLogoUrl} alt="Atual" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-6 py-2 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed border border-brand-orange/20"
                            >
                                {uploading ? 'Salvando...' : view === 'edit' ? 'Atualizar' : 'Salvar Condomínio'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
