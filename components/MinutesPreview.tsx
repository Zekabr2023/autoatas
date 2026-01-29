import React, { useEffect, useState, useRef } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface MinutesPreviewProps {
    htmlContent: string;
    onBack: () => void;
    condoName: string;
    companyName: string;
    companyLogo: string | null;
}

interface LineData {
    text: string;
    width: number;
    isJustified: boolean;
    isLastLine: boolean;
    originalHtml: string;
}

interface PageData {
    lines: LineData[];
    pageNumber: number;
}

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const MARGIN_PT = 70; // ~2.5cm
const CONTENT_WIDTH_PT = A4_WIDTH_PT - (MARGIN_PT * 2);
const LINE_HEIGHT_PT = 20; // Fixed line height
const FONT_SIZE_PT = 12;
const HEADER_HEIGHT_PT = 150;
const FOOTER_HEIGHT_PT = 50;

const MinutesPreview: React.FC<MinutesPreviewProps> = ({ htmlContent, onBack, condoName, companyName, companyLogo }) => {
    const [pages, setPages] = useState<PageData[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // === TYPESETTING ENGINE ===
    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Configure context for measurement
        // 1pt = 1.333px approx, but we can measure in pixels if we scale correctly.
        // Let's assume 1px = 1pt for simplicity in this logic, and scale via CSS print.
        ctx.font = `${FONT_SIZE_PT}pt "Times New Roman"`;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const allLines: LineData[] = [];

        // Helper to measure text
        const measure = (text: string) => ctx.measureText(text).width;

        // Process each paragraph
        Array.from(tempDiv.children).forEach((node) => {
            const el = node as HTMLElement;
            const text = el.innerText.trim();
            if (!text) {
                // Empty line
                allLines.push({ text: '', width: 0, isJustified: false, isLastLine: true, originalHtml: '<br>' });
                return;
            }

            const align = el.style.textAlign || 'justify'; // Default to justify
            const isJustified = align === 'justify';

            const words = text.split(/\s+/);
            let currentLineWords: string[] = [];
            let currentLineWidth = 0;

            words.forEach((word) => {
                const wordWidth = measure(word + ' ');
                if (currentLineWidth + wordWidth > CONTENT_WIDTH_PT) {
                    // Line full, push it
                    allLines.push({
                        text: currentLineWords.join(' '),
                        width: currentLineWidth,
                        isJustified: isJustified,
                        isLastLine: false,
                        originalHtml: ''
                    });
                    currentLineWords = [word];
                    currentLineWidth = measure(word + ' ');
                } else {
                    currentLineWords.push(word);
                    currentLineWidth += wordWidth;
                }
            });

            // Push remaining words
            if (currentLineWords.length > 0) {
                allLines.push({
                    text: currentLineWords.join(' '),
                    width: currentLineWidth,
                    isJustified: isJustified, // Last line of paragraph is usually NOT justified fully, but let's keep flag
                    isLastLine: true, // Mark as last line to disable full justification
                    originalHtml: ''
                });
            }
        });

        // Pagination Logic
        const newPages: PageData[] = [];
        let currentLines: LineData[] = [];
        let currentHeight = HEADER_HEIGHT_PT; // Start with header offset
        let pageNum = 1;

        allLines.forEach((line) => {
            const availableHeight = A4_HEIGHT_PT - MARGIN_PT - FOOTER_HEIGHT_PT;

            if (currentHeight + LINE_HEIGHT_PT > availableHeight) {
                // New Page
                newPages.push({ lines: currentLines, pageNumber: pageNum });
                currentLines = [];
                currentHeight = MARGIN_PT + 50; // Subsequent pages have smaller top margin/header
                pageNum++;
            }

            currentLines.push(line);
            currentHeight += LINE_HEIGHT_PT;
        });

        if (currentLines.length > 0) {
            newPages.push({ lines: currentLines, pageNumber: pageNum });
        }

        setPages(newPages);

    }, [htmlContent]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full animate-fade-in">
            {/* Control Bar */}
            <div className="flex justify-between items-center mb-6 bg-white/90 backdrop-blur p-4 rounded-xl border border-slate-200 shadow-lg print:hidden">
                <button
                    onClick={onBack}
                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                    &larr; Voltar para Edição
                </button>
                <div className="flex gap-4">
                    <div className="text-sm text-slate-500 flex items-center">
                        {pages.length} página(s) gerada(s)
                    </div>
                    <button
                        onClick={handlePrint}
                        className="interactive-button flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg shadow-brand-orange/20"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Imprimir / Salvar PDF
                    </button>
                </div>
            </div>

            {/* Hidden Canvas for Measurement */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Preview Area */}
            <div className="flex flex-col items-center gap-8 pb-20 bg-transparent p-8 overflow-auto h-[calc(100vh-150px)] print:h-auto print:overflow-visible print:bg-white print:p-0">
                {pages.map((page, pageIndex) => (
                    <div
                        key={pageIndex}
                        className="bg-white text-black shadow-2xl print:shadow-none relative print:break-after-page"
                        style={{
                            width: '210mm',
                            height: '297mm',
                            padding: `${MARGIN_PT}pt`,
                            boxSizing: 'border-box',
                            position: 'relative'
                        }}
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 w-full h-[150pt] border-b border-gray-200 p-[30pt] flex justify-between items-start">
                            {/* Simplified Header for Preview - You can enhance this to match the exact PDF header */}
                            <div className="w-1/3">
                                {companyLogo && <img src={companyLogo} className="h-12 object-contain" alt="Logo" />}
                                <div className="text-[8pt] text-center mt-2">{companyName}</div>
                            </div>
                            <div className="w-1/3 text-center">
                                <h1 className="font-bold text-[10pt]">ATA DA ASSEMBLEIA</h1>
                                <div className="text-[9pt]">{condoName}</div>
                            </div>
                            <div className="w-1/3 text-right text-[8pt]">
                                <div>Folha: {page.pageNumber}</div>
                                <div>Data: {new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Line Numbers Gutter */}
                        <div
                            className="absolute left-0 top-[150pt] bottom-[50pt] w-[30pt] border-r border-gray-300 flex flex-col items-end pr-1 pt-[4pt]"
                            style={{ fontFamily: 'monospace', fontSize: '9pt', lineHeight: `${LINE_HEIGHT_PT}pt` }}
                        >
                            {page.lines.map((_, i) => {
                                // Calculate global line number if needed, or per page. 
                                // Usually Atas are sequential. Let's do per page for now or global?
                                // Let's do sequential based on previous pages.
                                const startLine = pages.slice(0, pageIndex).reduce((acc, p) => acc + p.lines.length, 0);
                                return <div key={i} className="h-[20pt]">{startLine + i + 1}</div>;
                            })}
                        </div>

                        {/* Content Area */}
                        <div
                            className="absolute left-[35pt] right-[30pt] top-[150pt] bottom-[50pt]"
                            style={{
                                fontFamily: '"Times New Roman", serif',
                                fontSize: `${FONT_SIZE_PT}pt`,
                                lineHeight: `${LINE_HEIGHT_PT}pt`
                            }}
                        >
                            {page.lines.map((line, i) => (
                                <div
                                    key={i}
                                    className="whitespace-nowrap overflow-hidden"
                                    style={{
                                        height: `${LINE_HEIGHT_PT}pt`,
                                        textAlign: line.isJustified && !line.isLastLine ? 'justify' : 'left',
                                        textAlignLast: line.isJustified && !line.isLastLine ? 'justify' : 'left',
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: line.isJustified && !line.isLastLine ? 'space-between' : 'flex-start'
                                    }}
                                >
                                    {/* For full justification of single lines in Flexbox, we need to split words if we want perfect CSS justify, 
                      BUT 'text-align: justify' works on blocks. Since we have single lines, we might need a trick.
                      The trick: render the line as a block.
                  */}
                                    <div style={{ width: '100%', textAlign: line.isJustified && !line.isLastLine ? 'justify' : 'left', textAlignLast: line.isJustified && !line.isLastLine ? 'justify' : 'left' }}>
                                        {line.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 w-full h-[50pt] flex items-center justify-center border-t border-gray-200">
                            <div className="text-[8pt] text-gray-500">
                                {condoName} - Página {page.pageNumber}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .animate-fade-in > div:nth-child(3) { /* The Preview Area */
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                background: white;
                height: auto;
                overflow: visible;
            }
            .animate-fade-in > div:nth-child(3) > * {
                visibility: visible;
                margin: 0;
                page-break-after: always;
                box-shadow: none;
            }
        }
      `}</style>
        </div>
    );
};

export default MinutesPreview;
