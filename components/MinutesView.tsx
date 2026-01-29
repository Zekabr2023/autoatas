import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { supabase } from '../services/supabaseClient';
import { Condo } from './CondoManager';
import { saveAs } from 'file-saver';
import HeaderEditorModal from './HeaderEditorModal';
import { saveMinute } from '../services/minutesHistoryService';
import { updateTokenUsageCondo } from '../services/tokenService';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  Table,
  AlignmentType,
  ImageRun,
  convertInchesToTwip
} from 'docx';

interface MinutesViewProps {
  minutes: string;
  onReset: () => void;
  condoName: string;
  setCondoName: (name: string) => void;
  condoLogo: string | null;
  setCondoLogo: (logo: string | null) => void;
  companyName: string;
  companyLogo: string | null;
  onAddCondo: () => void;
  onViewHistory: () => void;
  condoListVersion?: number;
  fileName?: string;
  currentSessionId?: string;
}

declare const jspdf: any;
declare const html2canvas: any;

const LINE_HEIGHT = 28; // Fixed line height
const EDITOR_CONTENT_WIDTH = 734; // Matches PDF content area (794px - 60px margins)

// Generate SVG with enough lines (default 1000 to prevent restart)
const generateLineNumbersSvg = (color: string, lines = 1000) => {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="${lines * LINE_HEIGHT}">`;
  svgContent += `<style>text { font-family: courier, monospace; font-size: 12px; fill: ${color}; }</style>`;

  for (let i = 1; i <= lines; i++) {
    const y = (i - 1) * LINE_HEIGHT + 21;
    svgContent += `<text x="40" y="${y}" text-anchor="end">${i}</text>`;
  }

  svgContent += `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

// Get exact line number of last character in editor
const getLastLineNumber = (editorBody: HTMLElement): number => {
  console.log('=== DEBUG getLastLineNumber ===');
  console.log('editorBody width:', editorBody.offsetWidth);
  console.log('editorBody scrollHeight:', editorBody.scrollHeight);
  console.log('LINE_HEIGHT constant:', LINE_HEIGHT);

  // Find the last text node in the editor
  const walker = document.createTreeWalker(editorBody, NodeFilter.SHOW_TEXT, null);
  let lastTextNode: Text | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim().length > 0) {
      lastTextNode = node as Text;
    }
  }

  if (!lastTextNode) {
    console.log('No text node found, returning 1');
    return 1;
  }

  console.log('Last text node content (first 50 chars):', lastTextNode.textContent?.substring(0, 50));

  // Create a range at the end of the last text node
  const range = document.createRange();
  range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
  range.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);

  // Get the bounding rect of that position
  const rect = range.getBoundingClientRect();
  const bodyRect = editorBody.getBoundingClientRect();

  console.log('Last char rect.bottom:', rect.bottom);
  console.log('Body rect.top:', bodyRect.top);
  console.log('editorBody.scrollTop:', editorBody.scrollTop);

  // Calculate which line this Y position corresponds to
  const relativeY = rect.bottom - bodyRect.top + editorBody.scrollTop;
  const lineNumber = Math.ceil(relativeY / LINE_HEIGHT);

  console.log('relativeY:', relativeY);
  console.log('Calculated lineNumber:', lineNumber);
  console.log('=== END DEBUG ===');

  return Math.max(1, lineNumber);
};

const DEFAULT_HEADER_HTML = `
<table style="border-collapse: collapse; width: 100%; height: 153.011px; border: 1px solid rgb(0, 0, 0); margin-left: auto; margin-right: auto;" border="1"><colgroup><col style="width: 18.9164%;"><col style="width: 19.9208%;"><col style="width: 16.6524%;"><col style="width: 15.7229%;"><col style="width: 14.5319%;"><col style="width: 14.2557%;"></colgroup>
<tbody>
<tr style="height: 64.6591px;">
<td style="border-color: #000000; text-align: center; vertical-align: middle;" rowspan="2">{{COMPANY_LOGO}}<br>{{COMPANY_NAME}}</td>
<td style="border-color: #000000; text-align: center; vertical-align: middle;" rowspan="2"><strong>ATA DA ASSEMBLEIA</strong><br><strong>GERAL ORDINARIA</strong><br><strong>VIRTUAL</strong></td>
<td style="border-color: #000000; text-align: center; vertical-align: middle;" rowspan="2">{{CONDO_LOGO}}<br>{{CONDO_NAME}}</td>
<td style="border-color: #000000; text-align: center; vertical-align: middle;">
<p>DATA EVENTO:<br>{{DATE}}<br><br></p>
</td>
<td style="border-color: #000000; text-align: center; vertical-align: middle;">Pág: {{PAGE_NUM}}</td>
<td style="border-color: #000000; text-align: center; vertical-align: middle;">BAIXE SEU<br>APP AQUI<br><strong><br></strong></td>
</tr>
<tr style="height: 88.3523px; text-align: center;">
<td style="border-color: #000000; vertical-align: middle;">Início: {{START_TIME}}<br>Término:{{END_TIME}}</td>
<td style="border-color: #000000; vertical-align: middle;">A.G.O_V<br>{{YEAR}}</td>
<td style="border-color: #000000; vertical-align: middle;"><img style="display: block; margin-left: auto; margin-right: auto;" src="https://placehold.co/61x62?text=QR" width="61" height="62"></td>
</tr>
</tbody>
</table>
<p style="text-align: center;">&nbsp;</p>
`;

const parseMinutesToHTML = (text: string): string => {
  const trimmedText = text.trim();
  if (trimmedText === '') return '<p><br></p>';

  const lines = trimmedText.split('\n');
  let html = '';
  lines.forEach(line => {
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (processedLine.trim() !== '') {
      html += `<p>${processedLine}</p>`;
    } else {
      html += '<p><br></p>';
    }
  });
  return html;
};

const MinutesView: React.FC<MinutesViewProps> = ({
  minutes,
  onReset,
  condoName,
  setCondoName,
  condoLogo,
  setCondoLogo,
  companyName,
  companyLogo,
  onAddCondo,
  onViewHistory,
  condoListVersion,
  fileName,
  currentSessionId
}) => {
  const handleSaveToHistory = async () => {
    const editor = editorRef.current;
    const currentContent = editor ? editor.getContent() : content;

    // Update token history name if session ID is available
    if (currentSessionId && condoName) {
      updateTokenUsageCondo(currentSessionId, condoName);
    }

    await saveMinute({
      condoName: condoName || 'Condomínio',
      minutesHtml: currentContent,
      condoLogo: condoLogo,
      fileName: fileName,
      previewText: (editor ? editor.getContent({ format: 'text' }) : content).substring(0, 100),
      // Fix: Rename to match interface
      companyName: companyName,
      companyLogo: companyLogo,
      meetingDate: meetingDate,
      meetingStartTime: meetingStartTime,
      meetingEndTime: meetingEndTime
    });
  };
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [noParagraphs, setNoParagraphs] = useState(false); // Continuous text mode

  // Condos State
  const [availableCondos, setAvailableCondos] = useState<Condo[]>([]);
  useEffect(() => {
    fetchCondos();
  }, [condoName, condoListVersion]); // Re-fetch if name changes or version bump

  const fetchCondos = async () => {
    const { data } = await supabase.from('condominios').select('*').order('nome');
    if (data) setAvailableCondos(data);
  };

  useEffect(() => { fetchCondos(); }, []);

  const handleCondoSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const condo = availableCondos.find(c => c.id === selectedId);
    if (condo) {
      setCondoName(condo.nome);
      if (condo.logotipo_url) setCondoLogo(condo.logotipo_url);
      if (condo.cnpj) setCondoCnpj(condo.cnpj);
    }
  };

  const editorRef = useRef<any>(null);

  // Signatures state
  interface Signature {
    id: number;
    name: string;
    role: string;
  }
  const [signatures, setSignatures] = useState<Signature[]>([]);

  // Meeting info state
  const [meetingDate, setMeetingDate] = useState('28/07/2025');
  const [meetingStartTime, setMeetingStartTime] = useState('19h30');
  const [meetingEndTime, setMeetingEndTime] = useState('23h24');
  const [meetingYear, setMeetingYear] = useState('2025');
  const [condoCnpj, setCondoCnpj] = useState('');

  useEffect(() => {
    setContent(parseMinutesToHTML(minutes));
  }, [minutes]);

  // Handle Theme and Line Number Updates
  useEffect(() => {
    if (editorRef.current) {
      updateEditorStyles();
    }
  }, [showLineNumbers]);

  // Handle noParagraphs toggle - converts content structure
  const handleNoParagraphsToggle = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentContent = editor.getContent();
    const newNoParagraphs = !noParagraphs;

    if (newNoParagraphs) {
      // Convert to continuous text: remove paragraph breaks, join all text
      // Get text-only content, then wrap in a single paragraph
      const textContent = editor.getContent({ format: 'text' });
      // Replace multiple newlines with single space, preserve single linebreak as space
      const continuousText = textContent
        .replace(/\n\s*\n/g, ' ') // Double newlines to single space
        .replace(/\n/g, ' ')      // Single newlines to space
        .replace(/\s+/g, ' ')     // Multiple spaces to single
        .trim();
      setContent(`<p>${continuousText}</p>`);
    } else {
      // Convert back to paragraphs: split on sentence-ending patterns
      const textContent = editor.getContent({ format: 'text' });
      // Split on periods followed by uppercase letter (sentence boundaries)
      const sentences = textContent.split(/(?<=\.)\s+(?=[A-ZÁÀÃÉÊÍÓÔÕÚ0-9])/);
      // Group sentences into paragraphs (5 sentences each)
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 5) {
        paragraphs.push(sentences.slice(i, i + 5).join(' ').trim());
      }
      const html = paragraphs.filter(p => p.length > 0).map(p => `<p>${p}</p>`).join('');
      setContent(html || '<p><br></p>');
    }

    setNoParagraphs(newNoParagraphs);
  };

  // Header/Footer customization state
  const [headerHtml, setHeaderHtml] = useState(DEFAULT_HEADER_HTML);
  const [footerText, setFooterText] = useState('');
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [alignToContentMargin, setAlignToContentMargin] = useState(true); // Default: true for signature margins

  // Initialize footer default when condoName changes if empty
  useEffect(() => {
    if (!footerText && condoName) {
      setFooterText("CONDOMÍNIO DO EDIFÍCIO " + condoName.toUpperCase());
    }
  }, [condoName]);

  const replaceHeaderPlaceholders = (html: string, pageNum: number, totalPages: number) => {
    let processed = html
      .replace(/{{COMPANY_NAME}}/g, companyName || 'Sua Empresa')
      .replace(/{{CONDO_NAME}}/g, (condoName || 'EDIFÍCIO').toUpperCase())
      .replace(/{{DATE}}/g, meetingDate)
      .replace(/{{START_TIME}}/g, meetingStartTime)
      .replace(/{{END_TIME}}/g, meetingEndTime)
      .replace(/{{YEAR}}/g, meetingYear)
      .replace(/{{PAGE_NUM}}/g, `${pageNum}/${totalPages}`)
      .replace(/{{TOTAL_PAGES}}/g, totalPages.toString());

    // Handle COMPANY_LOGO - Convert to img tag if logo exists, otherwise remove placeholder
    if (companyLogo) {
      // First try to replace img tags with src pointing to placeholder
      processed = processed.replace(/<img[^>]*src=["']?{{COMPANY_LOGO}}["']?[^>]*>/g,
        `<img src="${companyLogo}" width="80" height="60" style="max-height: 60px; max-width: 80px; display: block; margin: auto; object-fit: contain;" />`);
      // Then replace any standalone text placeholders with an img tag
      processed = processed.replace(/{{COMPANY_LOGO}}/g,
        `<img src="${companyLogo}" width="80" height="60" style="max-height: 60px; max-width: 80px; display: block; margin: auto; object-fit: contain;" />`);
    } else {
      // Remove img tags that have the placeholder
      processed = processed.replace(/<img[^>]*src=["']?{{COMPANY_LOGO}}["']?[^>]*>/g, '');
      // Remove standalone placeholders
      processed = processed.replace(/{{COMPANY_LOGO}}/g, '');
    }

    // Handle CONDO_LOGO - Same logic
    if (condoLogo) {
      processed = processed.replace(/<img[^>]*src=["']?{{CONDO_LOGO}}["']?[^>]*>/g,
        `<img src="${condoLogo}" width="80" height="60" style="max-height: 60px; max-width: 80px; display: block; margin: auto; object-fit: contain;" />`);
      processed = processed.replace(/{{CONDO_LOGO}}/g,
        `<img src="${condoLogo}" width="80" height="60" style="max-height: 60px; max-width: 80px; display: block; margin: auto; object-fit: contain;" />`);
    } else {
      processed = processed.replace(/<img[^>]*src=["']?{{CONDO_LOGO}}["']?[^>]*>/g, '');
      processed = processed.replace(/{{CONDO_LOGO}}/g, '');
    }

    return processed;
  };

  const updateEditorStyles = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const body = editor.getBody();
    const lineColor = '#9ca3af'; // Slate 400 fixed for now since theme is gone

    if (showLineNumbers) {
      const bgImage = generateLineNumbersSvg(lineColor);
      body.style.backgroundImage = `url('${bgImage}')`;
      body.style.backgroundRepeat = 'repeat-y';
      body.style.backgroundPosition = '0 0';
      body.style.marginLeft = '0px';
      body.style.paddingLeft = '80px';
      body.style.lineHeight = `${LINE_HEIGHT}px`;
      // FIXED WIDTH to match PDF output
      body.style.width = `${EDITOR_CONTENT_WIDTH}px`;
      body.style.maxWidth = `${EDITOR_CONTENT_WIDTH}px`;
    } else {
      body.style.backgroundImage = 'none';
      body.style.paddingLeft = '16px';
      body.style.lineHeight = '1.5';
      body.style.width = 'auto';
      body.style.maxWidth = 'none';
    }

    // Also sync text color with theme
    body.style.color = '#000000';
  };

  // Smart line-break detection: Find safe cut point by scanning for blank rows
  const findSafeCutLine = (canvas: HTMLCanvasElement, theoreticalY: number, searchRange: number): number => {
    // Get canvas pixel data for analysis
    const ctx = canvas.getContext('2d');
    if (!ctx) return theoreticalY;

    const width = canvas.width;

    // Define search window: scan from theoretical position upward
    const searchStart = Math.max(0, Math.floor(theoreticalY - searchRange));
    const searchEnd = Math.floor(theoreticalY);

    // Check if a horizontal row is mostly blank (white/very light)
    const isRowBlank = (y: number): boolean => {
      if (y < 0 || y >= canvas.height) return false;

      // Sample 30 points across the width for efficiency
      const samples = 30;
      let whiteCount = 0;

      try {
        const imageData = ctx.getImageData(0, y, width, 1);

        for (let i = 0; i < samples; i++) {
          const x = Math.floor((width / samples) * i);
          const idx = x * 4;
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];

          // STRICTER threshold: must be VERY white (RGB > 252) to avoid faint anti-aliasing
          if (r > 252 && g > 252 && b > 252) {
            whiteCount++;
          }
        }

        // If 90%+ of samples are white, consider row blank
        return (whiteCount / samples) > 0.9;
      } catch (e) {
        return false;
      }
    };

    // Scan upward to find a CONTIGUOUS gap of blank rows
    // We want a gap of at least 15px (scaled) to be safe - as per user request
    const minGapSize = 20;
    let currentGapSize = 0;
    let gapEnd = -1; // Bottom of the potential gap

    for (let y = searchEnd; y >= searchStart; y--) {
      if (isRowBlank(y)) {
        if (currentGapSize === 0) gapEnd = y;
        currentGapSize++;

        if (currentGapSize >= minGapSize) {
          // Found a good gap! Return the middle.
          return gapEnd - Math.floor(currentGapSize / 2);
        }
      } else {
        // Hit text, reset gap
        currentGapSize = 0;
      }
    }

    // Fallback logic remains: return searchStart
  };

  const handleCopy = () => {
    if (editorRef.current) {
      const pureText = editorRef.current.getContent({ format: 'text' });
      navigator.clipboard.writeText(pureText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPDF = () => {
    if (!condoName) {
      alert('Por favor, selecione um condomínio antes de gerar o PDF.');
      return;
    }
    handleSaveToHistory();
    const tempContainer = document.createElement('div');

    // Dimensions
    const lineHeightPx = LINE_HEIGHT;
    // A4 width in px at 96dpi is approx 794px.
    // BUT we use 734px (exact content width) to ensure symmetric margins (no whitespace on right)
    const containerWidth = 734;

    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${containerWidth}px`;
    tempContainer.style.display = 'flex';
    tempContainer.style.background = 'white';
    tempContainer.style.paddingBottom = '50px'; // Safety buffer for last line

    document.body.appendChild(tempContainer);

    // --- Right Column: Text Content ---
    // MUST match content area: 734px total - 40px numbers = 694px text
    const contentCol = document.createElement('div');
    contentCol.style.width = '694px'; // 734 - 40px for numbers
    contentCol.style.paddingLeft = '0px';
    contentCol.style.paddingRight = '0px';
    contentCol.style.fontFamily = "'Times New Roman', serif";
    contentCol.style.fontSize = '14pt'; // Match editor font size
    contentCol.style.textAlign = 'justify';
    contentCol.style.color = 'black';
    contentCol.style.lineHeight = `${lineHeightPx}px`;
    contentCol.style.paddingTop = '3px'; // Shift text down to avoid cutting ascenders at slice boundary
    contentCol.style.boxSizing = 'border-box';
    contentCol.style.verticalAlign = 'top';

    // Strict block alignment styling
    const styleBlock = document.createElement('style');
    styleBlock.innerHTML = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        #pdf-export-content p, 
        #pdf-export-content h1, 
        #pdf-export-content h2, 
        #pdf-export-content h3, 
        #pdf-export-content div:not(#pdf-signatures):not(.sig-block), 
        #pdf-export-content li { 
            margin: 0 !important; 
            padding: 0 !important; 
            line-height: ${lineHeightPx}px !important;
        }
    `;
    tempContainer.appendChild(styleBlock);

    contentCol.id = 'pdf-export-content';
    contentCol.innerHTML = editorRef.current ? editorRef.current.getContent() : content;

    // --- Insert CONTENT first to calculate lines ---
    tempContainer.appendChild(contentCol);

    // --- Left Column: Numbers ---
    // Get EXACT line count from the EXPORT container to match fonts/wrapping perfectly
    let actualLineCount = 50; // fallback
    if (showLineNumbers) {
      // Use the contentCol we just added to DOM - this ensures strict 1:1 mapping with what is rendered
      actualLineCount = getLastLineNumber(contentCol);
    }

    if (showLineNumbers) {
      const numbersCol = document.createElement('div');
      numbersCol.style.width = '40px'; // Aligns with header left edge
      numbersCol.style.minWidth = '40px';
      numbersCol.style.paddingLeft = '0px'; // Numbers start at left edge
      numbersCol.style.paddingRight = '5px'; // Small gap before text
      numbersCol.style.textAlign = 'left'; // Left-aligned to match header border
      numbersCol.style.fontFamily = "'Courier New', monospace";
      numbersCol.style.fontSize = '11pt'; // Matched size for vertical alignment with 14pt text
      numbersCol.style.lineHeight = `${lineHeightPx}px`;
      numbersCol.style.color = '#000000';
      numbersCol.style.paddingTop = '3px'; // Match content column shift
      numbersCol.style.boxSizing = 'border-box';
      numbersCol.style.verticalAlign = 'top';

      // Use exact line count from generated content
      let numbersHtml = '';
      for (let i = 1; i <= actualLineCount; i++) {
        numbersHtml += `<div>${i}</div>`;
      }
      numbersCol.innerHTML = numbersHtml;

      // Insert BEFORE content
      tempContainer.insertBefore(numbersCol, contentCol);
    }

    // --- Add Signatures to Content ---
    if (signatures.length > 0) {
      const sigSection = document.createElement('div');
      sigSection.id = 'pdf-signatures'; // Excluded from CSS reset
      // Use padding instead of margin since CSS forces margin: 0 on all divs
      sigSection.style.paddingTop = '120px'; // Reasonable space - keeps on same page when possible
      sigSection.style.paddingBottom = '50px';
      sigSection.style.display = 'flex';
      sigSection.style.flexWrap = 'wrap';
      sigSection.style.justifyContent = 'space-around';
      sigSection.style.gap = '60px';
      sigSection.style.width = '100%';

      signatures.forEach(sig => {
        const sigBlock = document.createElement('div');
        sigBlock.className = 'sig-block'; // Excluded from CSS reset
        sigBlock.style.textAlign = 'center';
        sigBlock.style.minWidth = '250px';
        sigBlock.style.marginBottom = '40px';
        // Prevent signature from being split across pages
        sigBlock.style.pageBreakInside = 'avoid';
        sigBlock.style.breakInside = 'avoid';
        sigBlock.style.display = 'inline-block';

        sigBlock.innerHTML = `
          <div style="font-family: 'Times New Roman', serif; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">
            ${sig.name.toUpperCase()}
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: 14pt; text-transform: uppercase;">
            ${sig.role.toUpperCase()}
          </div>
        `;
        sigSection.appendChild(sigBlock);
      });

      contentCol.appendChild(sigSection);
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // === PDF HEADER ===
    // We now generate headers as images using HTML2Canvas for maximum flexibility
    // This function RETURNS a promise that resolves when the header is ready
    const generateHeaderCanvas = async (pageNum: number, totalPages: number) => {
      // Use EXACT same width as content container for perfect alignment
      // Table covers BOTH numbers area + text area = 734px total
      const containerWidth = 734;

      const headerContainer = document.createElement('div');
      headerContainer.style.position = 'absolute';
      headerContainer.style.left = '-9999px';
      headerContainer.style.width = `${containerWidth}px`;
      headerContainer.style.background = 'white';
      headerContainer.style.color = '#000000';
      headerContainer.style.fontFamily = "'Times New Roman', serif";
      headerContainer.style.fontSize = '10pt';
      headerContainer.style.display = 'block';

      // Table wrapper - uses FULL container width (covers both numbers and text areas)
      const tableCol = document.createElement('div');
      tableCol.style.width = alignToContentMargin ? `${containerWidth}px` : 'auto';

      const processedHeader = replaceHeaderPlaceholders(headerHtml, pageNum, totalPages);
      console.log('=== PDF Header Debug ===');
      console.log('alignToContentMargin:', alignToContentMargin);
      console.log('containerWidth:', containerWidth);

      tableCol.innerHTML = processedHeader;

      // Force explicit border styles on table cells for html2canvas
      const tables = tableCol.querySelectorAll('table');
      tables.forEach((table: HTMLElement) => {
        table.style.borderCollapse = 'collapse';
        table.style.border = '1px solid #000';
        table.style.width = '100%';
        table.style.maxWidth = '100%';
        table.style.marginLeft = '0';
        table.style.marginRight = '0';
      });

      const cells = tableCol.querySelectorAll('td, th');
      cells.forEach((cell: HTMLElement) => {
        cell.style.border = '1px solid #000';
        cell.style.padding = '5px';
      });

      headerContainer.appendChild(tableCol);
      document.body.appendChild(headerContainer);

      try {
        const canvas = await html2canvas(headerContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 850 // Same as content canvas
        });
        console.log('Header canvas generated:', canvas.width, 'x', canvas.height);
        document.body.removeChild(headerContainer);
        return canvas;
      } catch (e) {
        console.error("Error generating header", e);
        document.body.removeChild(headerContainer);
        return null;
      }
    };

    html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 850 // Ensure enough width
    }).then(async (canvas: any) => {
      document.body.removeChild(tempContainer);

      // Optimization: Avoid full PNG conversion
      // const imgData = canvas.toDataURL('image/png');
      // const imgProps = doc.getImageProperties(imgData);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50; // Increased margin for better document aesthetics and digital signature space

      const contentWidth = pageWidth - (margin * 2);
      // Determine height based on aspect ratio of the canvas vs content width
      const totalImgHeight = (canvas.height * contentWidth) / canvas.width;

      // --- CALCULATE TOTAL PAGES ---
      // We need to simulate the loop to know exactly how many pages we'll have
      let tempY = 0;
      let calculatedTotalPages = 0;

      while (tempY < totalImgHeight) {
        calculatedTotalPages++;
        const isFirstPage = calculatedTotalPages === 1;
        const headerLogicHeight = isFirstPage ? 150 : 90; // Approx heights
        const footerBuffer = 80;
        const availableHeight = pageHeight - headerLogicHeight - margin - footerBuffer;

        let sliceH = availableHeight;
        const isLast = (tempY + sliceH >= totalImgHeight);
        if (isLast) {
          sliceH = totalImgHeight - tempY + 10;
        }
        // Align to line height in pixels for consistency with main rendering
        // IMPORTANT: Use CANVAS_LINE_HEIGHT (LINE_HEIGHT * 2) since html2canvas uses scale:2
        if (!isLast) {
          const pxToPt = totalImgHeight / canvas.height;
          const ptToPx = canvas.height / totalImgHeight;
          const CANVAS_LINE_HEIGHT_CALC = LINE_HEIGHT * 2; // scale:2
          const sliceHPx = sliceH * ptToPx;
          const linesInSlice = Math.floor(sliceHPx / CANVAS_LINE_HEIGHT_CALC);
          const alignedSliceHPx = linesInSlice * CANVAS_LINE_HEIGHT_CALC;
          sliceH = alignedSliceHPx * pxToPt;
        }

        // Prevent infinite loop safety
        if (sliceH < 5) sliceH = availableHeight > 20 ? availableHeight : 20;

        tempY += sliceH;
      }


      // CRITICAL: Work in PIXELS for slicing to avoid rounding errors
      // Only convert to points when adding to PDF
      let currentYPx = 0; // Track position in PIXELS - starts at 0 which is line-aligned
      let pageNum = 1;
      const canvasHeight = canvas.height;
      const pxToPt = totalImgHeight / canvasHeight;

      // CRITICAL: html2canvas uses scale:2, so the canvas pixels are DOUBLE the DOM pixels
      // Therefore, LINE_HEIGHT in canvas coordinates is LINE_HEIGHT * scale
      const CANVAS_SCALE = 2; // Must match the scale in html2canvas options
      const CANVAS_LINE_HEIGHT = LINE_HEIGHT * CANVAS_SCALE; // 28 * 2 = 56px per line in canvas

      // Calculate total lines in document for debugging
      const totalLines = Math.ceil(canvasHeight / CANVAS_LINE_HEIGHT);
      console.log(`PDF Generation: ${totalLines} total lines, canvas height: ${canvasHeight}px, CANVAS_LINE_HEIGHT: ${CANVAS_LINE_HEIGHT}px (scale: ${CANVAS_SCALE})`);

      while (currentYPx < canvasHeight) {
        if (pageNum > 1) doc.addPage();

        // --- ADD HEADER ---
        const headerCanvas = await generateHeaderCanvas(pageNum, calculatedTotalPages);
        let headerHeightPt = 0;

        if (headerCanvas) {
          const headerImg = headerCanvas.toDataURL('image/png');
          // header aspect ratio
          const hAR = headerCanvas.height / headerCanvas.width;
          headerHeightPt = contentWidth * hAR; // maintain width, calc height

          // Limit header height to avoid taking up whole page if user made it huge
          if (headerHeightPt > 200) headerHeightPt = 200;

          doc.addImage(headerImg, 'PNG', margin, margin, contentWidth, headerHeightPt);
        } else {
          // Fallback empty space
          headerHeightPt = 80;
        }

        // --- ADD FOOTER ---
        const footerY = pageHeight - margin - 15; // Pushed down to bottom margin
        if (pageNum === 1) {
          doc.setFontSize(10);
          doc.setFont('times', 'bold');
          doc.text((footerText || ("CONDOMÍNIO DO " + (condoName || 'SAN SEBASTIAN').toUpperCase())), contentWidth / 2 + margin, footerY, { align: 'center' });
          doc.setFontSize(9);
          doc.text(`CNPJ: ${condoCnpj}`, contentWidth / 2 + margin, footerY + 12, { align: 'center' });
        }

        // Content starts below header + padding
        const startY = margin + headerHeightPt + 10;

        // Increased footer buffer to prevent low cuts overlapping
        const footerBuffer = 50; // Reverted as per user request (was 80)
        const availableHeightPt = pageHeight - startY - margin - footerBuffer;

        // Convert available height to PIXELS for calculation
        const availableHeightPx = availableHeightPt / pxToPt;

        // Calculate theoretical slice height (how much COULD fit mathematically)
        // We'll use this as the starting point for smart detection
        const theoreticalLinesInSlice = Math.floor(availableHeightPx / CANVAS_LINE_HEIGHT);
        const theoreticalSliceHeightPx = theoreticalLinesInSlice * CANVAS_LINE_HEIGHT;

        // Calculate theoretical cut position
        const theoreticalCutY = currentYPx + theoreticalSliceHeightPx;

        // Smart detection: Find actual safe cut point by scanning for blank rows
        // Search window: 3 lines above theoretical position
        const searchRange = CANVAS_LINE_HEIGHT * 3;

        let sliceHeightPx: number;
        const isLastSlice = (theoreticalCutY >= canvasHeight);

        if (isLastSlice) {
          // Last slice: include everything remaining
          sliceHeightPx = canvasHeight - currentYPx;
        } else {
          // Use smart detection to find safe cut point
          const safeCutY = findSafeCutLine(canvas, theoreticalCutY, searchRange);
          sliceHeightPx = safeCutY - currentYPx;

          // Safety: ensure we got a valid slice height
          if (sliceHeightPx < CANVAS_LINE_HEIGHT) {
            // Fallback to at least 1 line if detection failed
            sliceHeightPx = CANVAS_LINE_HEIGHT;
          }
        }

        // CRITICAL: Clamp to canvas bounds
        if (currentYPx + sliceHeightPx > canvasHeight) {
          sliceHeightPx = canvasHeight - currentYPx;
        }

        // Prevent infinite loop if slice is too small
        if (sliceHeightPx < CANVAS_LINE_HEIGHT && !isLastSlice) {
          sliceHeightPx = CANVAS_LINE_HEIGHT;
        }

        // Debug logging
        const startLine = Math.floor(currentYPx / CANVAS_LINE_HEIGHT) + 1;
        const endLine = Math.floor((currentYPx + sliceHeightPx) / CANVAS_LINE_HEIGHT);
        console.log(`Page ${pageNum}: Y=${currentYPx}px to ${currentYPx + sliceHeightPx}px, Lines ${startLine}-${endLine}, sliceH=${sliceHeightPx}px, availH=${availableHeightPx}px`);

        // Break if nothing left
        if (sliceHeightPx <= 0 || currentYPx >= canvasHeight) {
          break;
        }

        // Create slice canvas
        const sCanvas = document.createElement('canvas');
        sCanvas.width = canvas.width;
        sCanvas.height = Math.ceil(sliceHeightPx); // Ensure integer height
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          // Fill white first to prevent transparent black artifacts
          sCtx.fillStyle = '#ffffff';
          sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);

          // Draw from source canvas
          sCtx.drawImage(
            canvas,
            0, Math.floor(currentYPx), // Source x, y (use floor for pixel alignment)
            canvas.width, Math.ceil(sliceHeightPx), // Source w, h
            0, 0, // Dest x, y
            canvas.width, Math.ceil(sliceHeightPx) // Dest w, h
          );
        }

        // COMPRESSION: JPEG 0.8
        const sliceImg = sCanvas.toDataURL('image/jpeg', 0.8);

        // Convert pixel height to points for PDF
        const sliceHeightPt = sliceHeightPx * pxToPt;
        doc.addImage(sliceImg, 'JPEG', margin, startY, contentWidth, sliceHeightPt);

        // Advance position in PIXELS (aligned to LINE_HEIGHT)
        currentYPx += sliceHeightPx;
        pageNum++;
      }
      doc.save("ata-profissional.pdf");
    });
  };


  const handleExportDOCX = async () => {
    if (!condoName) {
      alert('Por favor, selecione um condomínio antes de exportar para Word.');
      return;
    }
    handleSaveToHistory();
    const editor = editorRef.current;

    // Get text content (without HTML tags)
    const textContent = editor ? editor.getContent({ format: 'text' }) : content;

    // Calculate replacements
    const finalCompanyName = companyName || 'Sua Empresa';
    const finalCondoName = (condoName || 'EDIFÍCIO').toUpperCase();

    // Process Footer Text
    let processedFooterText = footerText || ("CONDOMÍNIO DO " + finalCondoName);
    processedFooterText = processedFooterText
      .replace(/{{CONDO_NAME}}/g, finalCondoName)
      .replace(/{{COMPANY_NAME}}/g, finalCompanyName)
      .replace(/{{CNPJ}}/g, condoCnpj || '');

    // Helper function to convert base64 to Uint8Array (browser-compatible)
    const base64ToUint8Array = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    };

    // Process header HTML with placeholders replaced
    const processedHeaderHtml = replaceHeaderPlaceholders(headerHtml, 1, 1)
      .replace(/{{CNPJ}}/g, condoCnpj || '');

    // Debug: log processed HTML
    console.log('Processed Header HTML:', processedHeaderHtml);

    // Render header HTML as image using html2canvas
    const renderHeaderAsImage = async (): Promise<{ data: Uint8Array; width: number; height: number } | null> => {
      return new Promise((resolve) => {
        // Create temporary container for rendering
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '700px'; // Fixed width for consistent rendering
        container.style.background = 'white';
        container.style.padding = '10px';
        container.style.fontFamily = "'Times New Roman', Times, serif";
        container.style.fontSize = '10pt';
        container.style.color = '#000000'; // Ensure black text

        // Insert processed header HTML
        container.innerHTML = processedHeaderHtml;

        // Apply table styles for proper rendering
        const tables = container.querySelectorAll('table');
        tables.forEach((table: Element) => {
          (table as HTMLElement).style.borderCollapse = 'collapse';
          (table as HTMLElement).style.width = '100%';
        });

        const cells = container.querySelectorAll('td, th');
        cells.forEach((cell: Element) => {
          (cell as HTMLElement).style.border = '1px solid #000';
          (cell as HTMLElement).style.padding = '5px';
          (cell as HTMLElement).style.verticalAlign = 'middle';
          (cell as HTMLElement).style.color = '#000000'; // Ensure black text in cells
        });

        // Also apply color to all text elements
        const textElements = container.querySelectorAll('p, span, strong, b, td, th');
        textElements.forEach((el: Element) => {
          (el as HTMLElement).style.color = '#000000';
        });

        document.body.appendChild(container);

        // Wait a moment for fonts to load, then render
        setTimeout(() => {
          html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: true, // Enable logging for debug
            backgroundColor: '#ffffff',
            allowTaint: true
          }).then((canvas: HTMLCanvasElement) => {
            document.body.removeChild(container);

            // Convert canvas to base64
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            const data = base64ToUint8Array(base64);

            resolve({
              data,
              width: canvas.width / 2, // Adjust for scale
              height: canvas.height / 2
            });
            resolve(null);
          });
        }, 500); // Wait 500ms for fonts to render
      });
    };

    // Render header as image
    const headerImageData = await renderHeaderAsImage();

    // Create header content with the rendered image
    const createHeaderContent = (): (Paragraph | Table)[] => {
      if (headerImageData) {
        // Calculate dimensions to fit in document width (about 6.5 inches = 468 points)
        const maxWidth = 600;
        const aspectRatio = headerImageData.height / headerImageData.width;
        const imageWidth = Math.min(headerImageData.width, maxWidth);
        const imageHeight = imageWidth * aspectRatio;

        return [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: headerImageData.data,
                transformation: {
                  width: imageWidth,
                  height: imageHeight
                },
                type: 'png'
              })
            ]
          })
        ];
      }

      // Fallback: simple text header
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'ATA DA ASSEMBLEIA GERAL ORDINÁRIA', bold: true, size: 28 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: finalCondoName, size: 24 })]
        })
      ];
    };

    // Create footer content
    const createFooterContent = () => {
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: processedFooterText, bold: true, size: 20 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `CNPJ: ${condoCnpj}`, size: 18 })]
        })
      ];
    };

    // Parse text content into paragraphs
    const createBodyParagraphs = () => {
      const paragraphs: Paragraph[] = [];
      const lines = textContent.split('\n');

      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line
          paragraphs.push(new Paragraph({ children: [] }));
        } else {
          paragraphs.push(new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            children: [new TextRun({ text: line, size: 24, font: 'Times New Roman' })]
          }));
        }
      }

      return paragraphs;
    };

    // Create signature paragraphs
    const createSignatureParagraphs = () => {
      if (signatures.length === 0) return [];

      const sigParagraphs: Paragraph[] = [
        new Paragraph({ children: [] }), // Space before signatures
        new Paragraph({ children: [] }),
        new Paragraph({ children: [] })
      ];

      // Create signature blocks
      for (const sig of signatures) {
        sigParagraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: '________________________________', size: 24 })]
        }));
        sigParagraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: sig.name.toUpperCase(), bold: true, size: 24 })]
        }));
        sigParagraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: sig.role, size: 22 })]
        }));
      }

      return sigParagraphs;
    };

    // Build the document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.2), // More space for header
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(0.75)
            }
          }
        },
        headers: {
          default: new Header({
            children: createHeaderContent()
          })
        },
        footers: {
          default: new Footer({
            children: createFooterContent()
          })
        },
        children: [
          ...createBodyParagraphs(),
          ...createSignatureParagraphs()
        ]
      }]
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Ata-${condoName || 'Condominio'}.docx`);
  };

  return (
    <div className="w-full flex justify-center pb-10">
      <div className="w-fit max-w-[95vw] bg-white/80 border border-white/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl animate-fade-in mx-auto">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6 border-b border-slate-200/50 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">Editor Avançado</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsHeaderModalOpen(true)}
              className="interactive-button flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg"
            >
              <span className="text-lg">🧾</span>
              Cabeçalho
            </button>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-200 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors">
              <span className="text-sm font-semibold text-slate-700 select-none">
                {showLineNumbers ? '🔢 Com Linhas' : '#️⃣ Sem Linhas'}
              </span>
              <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  checked={showLineNumbers}
                  onChange={() => setShowLineNumbers(!showLineNumbers)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer duration-200 ease-in outline-none focus:outline-none right-0 border-brand-green checked:right-0"
                  style={{ right: showLineNumbers ? '0' : 'auto', left: showLineNumbers ? 'auto' : '0' }}
                />
                <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${showLineNumbers ? 'bg-brand-green' : 'bg-gray-300'}`}></label>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-200 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors">
              <span className="text-sm font-semibold text-slate-700 select-none">
                {noParagraphs ? '📝 Contínuo' : '¶ Parágrafos'}
              </span>
              <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  checked={noParagraphs}
                  onChange={handleNoParagraphsToggle}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer duration-200 ease-in outline-none focus:outline-none"
                  style={{ right: noParagraphs ? '0' : 'auto', left: noParagraphs ? 'auto' : '0', borderColor: noParagraphs ? '#f59e0b' : '#9ca3af' }}
                />
                <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${noParagraphs ? 'bg-amber-400' : 'bg-gray-300'}`}></label>
              </div>
            </label>

            <button onClick={handleCopy} className="interactive-button flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg">
              <ClipboardIcon className="w-5 h-5" />
              Copiar
            </button>
            <button onClick={onViewHistory} className="interactive-button flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg">
              <span className="text-lg">📂</span>
              Histórico
            </button>
            <button onClick={onReset} className="interactive-button flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg">
              Nova Ata
            </button>
          </div>
        </div>


        <div className="bg-white rounded-lg border border-slate-300 overflow-hidden min-h-[600px] relative w-[210mm] max-w-full mx-auto shadow-sm">
          <Editor
            apiKey="iiicjcizv1u51gwujqcthw54rnk3ytt435cwewrxyvjidy6i"
            onInit={(evt, editor) => {
              editorRef.current = editor;
              updateEditorStyles();
            }}
            value={content}
            onEditorChange={(newContent) => setContent(newContent)}
            init={{
              height: 600,
              menubar: false, // Hide File/Edit/View menu
              statusbar: false, // Hide bottom status bar
              branding: false, // Try to hide branding
              promotion: false, // Hide "Upgrade" button
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
              ],
              toolbar: 'undo redo | ' +
                'bold italic underline | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat',
              content_style: `
                body { 
                    font-family: 'Times New Roman', serif; 
                    font-size: 14pt; 
                    color: black;
                    transition: all 0.3s ease;
                    margin: 0 auto;
                    padding-top: 4px; 
                    padding-left: 80px;
                    line-height: 28px;
                    /* CRITICAL: Fixed width with border-box */
                    box-sizing: border-box !important;
                    width: 734px !important;
                    max-width: 734px !important;
                    /* 734px total - 80px padding = 654px text area */
                }
                /* Force grid alignment on blocks */
                p, h1, h2, h3, h4, h5, h6, div, li, ol, ul { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    line-height: 28px !important;
                }
                /* Hide branding via CSS injection */
                .tox-statusbar, .tox-promotion { display: none !important; }
                
                h1, h2, h3 { font-size: 14pt !important; font-weight: bold; }
            `,
              language_url: '/tinymce/langs/pt_BR.js',
            }}
          />
        </div>

        {/* Meeting Info Section removed - data is collected before transcription */}

        {/* Signatures Section */}
        <div className="mt-6 p-4 bg-white/50 rounded-lg border border-white/30 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">✍️ Assinaturas</h3>
            <button
              onClick={() => setSignatures([...signatures, { id: Date.now(), name: '', role: '' }])}
              className="flex items-center gap-2 bg-brand-green hover:bg-brand-green-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              + Adicionar
            </button>
          </div>

          {signatures.length === 0 ? (
            <p className="text-slate-700 text-sm italic">Nenhuma assinatura adicionada. Clique em "Adicionar" para incluir assinantes.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signatures.map((sig, index) => (
                <div key={sig.id} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-800">Assinante {index + 1}</span>
                    <button
                      onClick={() => setSignatures(signatures.filter(s => s.id !== sig.id))}
                      className="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      ✕ Remover
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={sig.name}
                    onChange={(e) => setSignatures(signatures.map(s => s.id === sig.id ? { ...s, name: e.target.value } : s))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Cargo (ex: Presidente, Secretária)"
                    value={sig.role}
                    onChange={(e) => setSignatures(signatures.map(s => s.id === sig.id ? { ...s, role: e.target.value } : s))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>



        <div className="flex justify-end mt-6 gap-4">
          <button onClick={handleExportDOCX} className="interactive-button flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
            Exportar Word
          </button>
          <button onClick={handleExportPDF} className="interactive-button flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-brand-orange/20 transition-all">
            <DownloadIcon className="w-5 h-5" />
            Gerar PDF
          </button>
        </div>

        <HeaderEditorModal
          isOpen={isHeaderModalOpen}
          onClose={() => setIsHeaderModalOpen(false)}
          onSave={(html, footer, alignMargin) => {
            setHeaderHtml(html);
            setFooterText(footer);
            setAlignToContentMargin(alignMargin);
          }}
          currentHeaderHtml={headerHtml}
          currentFooterText={footerText}
          currentAlignToContentMargin={alignToContentMargin}
        />

      </div>
    </div>
  );
};

export default MinutesView;
