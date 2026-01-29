import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tinymce/tinymce-react';

interface HeaderEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (headerHtml: string, footerText: string, alignToContentMargin: boolean) => void;
    currentHeaderHtml: string;
    currentFooterText: string;
    currentAlignToContentMargin?: boolean;
}

interface SavedHeader {
    id: string;
    name: string;
    html: string;
    footer: string;
}

const HeaderEditorModal: React.FC<HeaderEditorModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentHeaderHtml,
    currentFooterText,
    currentAlignToContentMargin = true,
}) => {
    const editorRef = useRef<any>(null);
    const [footerText, setFooterText] = useState(currentFooterText);
    const [alignToContentMargin, setAlignToContentMargin] = useState(currentAlignToContentMargin);

    // Saved Headers State
    const [savedHeaders, setSavedHeaders] = useState<SavedHeader[]>([]);
    const [selectedHeaderId, setSelectedHeaderId] = useState<string>('');
    const [newHeaderName, setNewHeaderName] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('autoatas_saved_headers');
        if (saved) {
            try {
                setSavedHeaders(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved headers", e);
            }
        }
    }, []);

    const handleSaveTemplate = () => {
        if (!newHeaderName.trim() || !editorRef.current) return;

        const content = editorRef.current.getContent();
        const newHeader: SavedHeader = {
            id: Date.now().toString(),
            name: newHeaderName,
            html: content,
            footer: footerText
        };

        const updated = [...savedHeaders, newHeader];
        setSavedHeaders(updated);
        localStorage.setItem('autoatas_saved_headers', JSON.stringify(updated));
        setNewHeaderName('');
        alert('Modelo salvo com sucesso!');
    };

    const handleLoadTemplate = () => {
        const header = savedHeaders.find(h => h.id === selectedHeaderId);
        if (header && editorRef.current) {
            editorRef.current.setContent(header.html);
            setFooterText(header.footer);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este modelo?')) {
            const updated = savedHeaders.filter(h => h.id !== id);
            setSavedHeaders(updated);
            localStorage.setItem('autoatas_saved_headers', JSON.stringify(updated));
            if (selectedHeaderId === id) setSelectedHeaderId('');
        }
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setFooterText(currentFooterText);
        }
    }, [isOpen, currentFooterText]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset'; // Cleanup on unmount
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (editorRef.current) {
            const content = editorRef.current.getContent();
            onSave(content, footerText, alignToContentMargin);
            onClose();
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Editar Cabeçalho e Rodapé (PDF)</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-6 flex-1">

                    {/* Header Editor */}
                    <div>
                        {/* Saved Templates Section */}
                        <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
                            <label className="block text-sm font-bold text-gray-800 mb-2">Modelos Salvos</label>
                            <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[200px]">
                                    <select
                                        value={selectedHeaderId}
                                        onChange={(e) => setSelectedHeaderId(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded text-slate-800 text-sm focus:ring-2 focus:ring-brand-orange"
                                    >
                                        <option value="">Selecione um modelo...</option>
                                        {savedHeaders.map(h => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleLoadTemplate}
                                    disabled={!selectedHeaderId}
                                    className="px-3 py-2 bg-blue-600/80 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                                >
                                    Carregar
                                </button>
                                {selectedHeaderId && (
                                    <button
                                        onClick={() => handleDeleteTemplate(selectedHeaderId)}
                                        className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                                    >
                                        Excluir
                                    </button>
                                )}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Nome do novo modelo..."
                                        value={newHeaderName}
                                        onChange={(e) => setNewHeaderName(e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded text-slate-800 text-sm focus:ring-2 focus:ring-brand-orange"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveTemplate}
                                    disabled={!newHeaderName.trim()}
                                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                                >
                                    Salvar Atual como Novo
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                Cabeçalho (Tabela)
                            </label>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                                    Arraste as variáveis para o editor:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'Nome da Empresa', value: '{{COMPANY_NAME}}' },
                                        { label: 'Nome do Condomínio', value: '{{CONDO_NAME}}' },
                                        { label: 'Logo Empresa', value: '{{COMPANY_LOGO}}' },
                                        { label: 'Logo Condomínio', value: '{{CONDO_LOGO}}' },
                                        { label: 'Data', value: '{{DATE}}' },
                                        { label: 'Início', value: '{{START_TIME}}' },
                                        { label: 'Término', value: '{{END_TIME}}' },
                                        { label: 'Ano', value: '{{YEAR}}' },
                                        { label: 'Paginação (1/X)', value: '{{PAGE_NUM}}' },
                                        { label: 'CNPJ', value: '{{CNPJ}}' },
                                    ].map((v) => (
                                        <div
                                            key={v.value}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', v.value);
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            className="cursor-grab active:cursor-grabbing px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm flex items-center gap-1.5 group select-none active:scale-95 active:shadow-inner"
                                        >
                                            <span className="text-slate-300 group-hover:text-orange-300 font-sans text-lg leading-none">⋮⋮</span>
                                            {v.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <Editor
                                apiKey="iiicjcizv1u51gwujqcthw54rnk3ytt435cwewrxyvjidy6i"
                                onInit={(evt, editor) => editorRef.current = editor}
                                initialValue={currentHeaderHtml}
                                init={{
                                    height: 300,
                                    menubar: false,
                                    plugins: ['table', 'code', 'image'],
                                    toolbar: 'undo redo | table | bold italic | alignleft aligncenter alignright | code',
                                    // Table-specific toolbar with vertical alignment
                                    table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablecellprops tablemergecells tablesplitcells | tablecellvalign',
                                    // Enable advanced table options
                                    table_advtab: true,
                                    table_cell_advtab: true,
                                    table_row_advtab: true,
                                    // Default cell vertical alignment
                                    table_default_styles: {
                                        'border-collapse': 'collapse',
                                        'width': '100%'
                                    },
                                    table_cell_class_list: [
                                        { title: 'Nenhum', value: '' },
                                        { title: 'Alinhado Topo', value: 'valign-top' },
                                        { title: 'Alinhado Meio', value: 'valign-middle' },
                                        { title: 'Alinhado Base', value: 'valign-bottom' }
                                    ],
                                    content_style: `
                                        body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; }
                                        table { width: 100%; border-collapse: collapse; }
                                        td, th { border: 1px solid black; padding: 4px; vertical-align: middle; }
                                        .valign-top { vertical-align: top; }
                                        .valign-middle { vertical-align: middle; }
                                        .valign-bottom { vertical-align: bottom; }
                                    `,
                                    language_url: '/tinymce/langs/pt_BR.js',
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Editor */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Rodapé (Texto)
                        </label>
                        <input
                            type="text"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            onDrop={(e) => {
                                e.preventDefault();
                                const text = e.dataTransfer.getData('text/plain');
                                const input = e.target as HTMLInputElement;
                                const start = input.selectionStart || 0;
                                const end = input.selectionEnd || 0;
                                const newValue = footerText.substring(0, start) + text + footerText.substring(end);
                                setFooterText(newValue);
                                // Move cursor after inserted text
                                setTimeout(() => {
                                    input.setSelectionRange(start + text.length, start + text.length);
                                    input.focus();
                                }, 0);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange outline-none text-slate-800 bg-white"
                            placeholder="Ex: CONDOMÍNIO DO EDIFÍCIO {{CONDO_NAME}}"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            O CNPJ será adicionado automaticamente abaixo deste texto na primeira página.
                        </p>
                    </div>

                    {/* Margin Options */}
                    <div className="p-4 bg-orange-100/70 rounded-lg border border-orange-300">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alignToContentMargin}
                                onChange={(e) => setAlignToContentMargin(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange accent-orange-500"
                            />
                            <div>
                                <span className="font-semibold text-gray-800">📐 Margem ajustada ao texto</span>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    Quando marcado, a tabela do cabeçalho terá a mesma largura da área de texto (734px),
                                    garantindo margens ideais para assinatura digital.
                                </p>
                            </div>
                        </label>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-brand-green hover:bg-brand-green-dark text-white font-bold rounded-lg shadow-lg transition-colors"
                    >
                        Salvar Alterações
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default HeaderEditorModal;
