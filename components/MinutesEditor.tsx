import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface MinutesEditorProps {
    initialContent: string;
    onContentChange: (html: string) => void;
    onProceed: () => void;
}

const MinutesEditor: React.FC<MinutesEditorProps> = ({ initialContent, onContentChange, onProceed }) => {
    return (
        <div className="w-full bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-sm animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Editar Ata</h2>
                <button
                    onClick={onProceed}
                    className="interactive-button bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                >
                    Prosseguir &rarr;
                </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden min-h-[500px]">
                <Editor
                    apiKey="iiicjcizv1u51gwujqcthw54rnk3ytt435cwewrxyvjidy6i"
                    initialValue={initialContent}
                    onEditorChange={(content) => onContentChange(content)}
                    init={{
                        height: 500,
                        menubar: true,
                        plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | ' +
                            'bold italic underline | alignleft aligncenter ' +
                            'alignright alignjustify | bullist numlist outdent indent | ' +
                            'removeformat | help',
                        content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:14px; color: #1A1A1A; background-color: #FFFFFF; }',
                        language_url: '/tinymce/langs/pt_BR.js', // Optional: if we want to host language file locally later
                        // For now we rely on default English or auto-detection if cloud supports it without file. 
                        // Actually cloud usually handles language if passed in tag, but let's stick to default for now to ensure load.
                    }}
                />
            </div>
        </div>
    );
};

export default MinutesEditor;
