
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppState, MinutesTemplate } from '../types';
import Header from '../components/Header';
import FileUpload from '../components/FileUpload';
import Loader from '../components/Loader';
import TranscriptionView from '../components/TranscriptionView';
import MinutesView from '../components/MinutesView';
import { addTokenUsage } from '../services/tokenService';
import CondoManager, { Condo } from '../components/CondoManager';
import SettingsModal from '../components/SettingsModal';
import SupportModal from '../components/SupportModal';
import BillingModal from '../components/BillingModal';
import HistoryView from '../components/HistoryView';
import { transcribeMedia, generateMinutesViaBackend } from '../services/videoUploadService';
import { saveMinute, getMinuteById } from '../services/minutesHistoryService';
import FullMinutesHistoryView from '../components/FullMinutesHistoryView';
import ReadOnlyMinuteView from '../components/ReadOnlyMinuteView';
import { SavedMinute } from '../services/minutesHistoryService';

import { useTheme } from '../contexts/ThemeContext';


export default function MainApplication() {
    const { tenant } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isCondoModalOpen, setIsCondoModalOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isBillingOpen, setIsBillingOpen] = useState(false);
    const [isMinutesHistoryOpen, setIsMinutesHistoryOpen] = useState(false);
    const [isReadOnlyOpen, setIsReadOnlyOpen] = useState(false);

    // Initialize from URL if present
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'history') {
            setIsHistoryOpen(true);
            // Clear param to avoid re-opening on refresh if user closed it
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('mode');
            setSearchParams(newParams);
        }
    }, [searchParams]);

    const [selectedMinute, setSelectedMinute] = useState<SavedMinute | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState<string>('');
    const [minutes, setMinutes] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [conversionProgress, setConversionProgress] = useState<number>(0);
    const [condoName, setCondoName] = useState<string>('');
    const [condoLogo, setCondoLogo] = useState<string | null>(null);
    const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);
    const [minutesTemplate, setMinutesTemplate] = useState<MinutesTemplate>(MinutesTemplate.FORMAL);

    const [companyName, setCompanyName] = useState<string>('');
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const [currentSessionId, setCurrentSessionId] = useState<string>('');
    const [condoListVersion, setCondoListVersion] = useState(0);

    useEffect(() => {
        const savedCompanyName = localStorage.getItem('companyName');
        const savedCompanyLogo = localStorage.getItem('companyLogo');
        if (savedCompanyName) setCompanyName(savedCompanyName);
        if (savedCompanyLogo) setCompanyLogo(savedCompanyLogo);
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent | DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent | DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent | DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent | DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = 'dataTransfer' in e ? e.dataTransfer?.files : null;
        if (files && files.length > 0) {
            const file = files[0];
            const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'video/mp4', 'video/quicktime', 'video/mpeg', 'video/webm'];

            // Check extension as fallback
            const extension = file.name.split('.').pop()?.toLowerCase();
            const validExtensions = ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'mpeg', 'webm'];

            if (validTypes.includes(file.type) || (extension && validExtensions.includes(extension))) {
                handleFileSelect(file);
            } else {
                setError('Formato de arquivo não suportado. Por favor, envie arquivos de áudio ou vídeo.');
            }
        }
    }, []);

    useEffect(() => {
        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

    const handleSaveSettings = (name: string, logo: string | null, apiKey: string) => {
        setCompanyName(name);
        localStorage.setItem('companyName', name);
        if (logo) {
            setCompanyLogo(logo);
            localStorage.setItem('companyLogo', logo);
        }
        if (apiKey) {
            localStorage.setItem('geminiApiKey', apiKey);
        } else {
            localStorage.removeItem('geminiApiKey');
        }
        setTimeout(() => {
            setIsSettingsOpen(false);
            if (apiKey) setError('');
        }, 0);
    };

    const handleFileSelect = (file: File) => {
        setMediaFile(file);
        setAppState(AppState.FILE_SELECTED);
        setError('');
    };

    const handleClearFile = () => {
        setMediaFile(null);
        setAppState(AppState.IDLE);
        setError('');
    };

    const handleStartTranscription = useCallback(async () => {
        if (!mediaFile) return;

        if (!selectedCondo) {
            setError('Por favor, selecione um condomínio antes de iniciar a conversão.');
            setIsCondoModalOpen(true);
            return;
        }

        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) {
            setError('Por favor, configure a sua chave de API do Gemini nas configurações antes de continuar.');
            setIsSettingsOpen(true);
            return;
        }

        setAppState(AppState.TRANSCRIBING);
        setError('');
        setConversionProgress(0);
        const sessionId = `session_${Date.now()}`;
        setCurrentSessionId(sessionId);

        try {
            setLoadingMessage('Enviando arquivo para processamento...');

            // Unified backend processing - works for both audio and video
            const result = await transcribeMedia(mediaFile, apiKey, (progress) => {
                setConversionProgress(progress.percentage);
                if (progress.stage) {
                    setLoadingMessage(progress.stage);
                }
            });

            if (result.usageMetadata) {
                addTokenUsage({
                    id: sessionId,
                    timestamp: new Date().toISOString(),
                    transcriptionUsage: {
                        promptTokenCount: (result.usageMetadata as any).promptTokenCount,
                        candidatesTokenCount: (result.usageMetadata as any).candidatesTokenCount,
                    }
                });
            }

            setTranscription(result.transcription.trim());
            setAppState(AppState.TRANSCRIBED);

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Ocorreu um erro ao processar o arquivo. Tente novamente.');
            setAppState(AppState.FILE_SELECTED);
        }
    }, [mediaFile, selectedCondo]);

    const handleStartMinuteGeneration = useCallback(async () => {
        if (!transcription || !currentSessionId) return;

        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) {
            setError('API Key não encontrada.');
            return;
        }

        setAppState(AppState.GENERATING);
        setError('');
        try {
            setLoadingMessage('Estruturando a ata e resumindo deliberações...');

            const result = await generateMinutesViaBackend(
                transcription,
                condoName || 'Condomínio',
                minutesTemplate,
                apiKey
            );

            setMinutes(result.minutes);

            const savedId = await saveMinute({
                condoName: condoName || 'Condomínio',
                minutesHtml: result.minutes,
                condoLogo: condoLogo,
                fileName: mediaFile?.name,
                previewText: result.minutes.substring(0, 100)
            });

            if (result.usageMetadata) {
                addTokenUsage({
                    id: currentSessionId,
                    timestamp: new Date().toISOString(),
                    generationUsage: {
                        promptTokenCount: (result.usageMetadata as any).promptTokenCount,
                        candidatesTokenCount: (result.usageMetadata as any).candidatesTokenCount,
                    },
                    condoName: condoName || 'Condomínio',
                    minuteId: savedId || undefined
                });
            }

            setAppState(AppState.GENERATED);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Ocorreu um erro ao gerar a ata. Tente novamente.');
            setAppState(AppState.TRANSCRIBED);
        }
    }, [transcription, condoName, minutesTemplate, currentSessionId]);

    const handleReset = () => {
        setMediaFile(null);
        setTranscription('');
        setMinutes('');
        setError('');
        setLoadingMessage('');
        setCondoName('');
        setCondoLogo(null);
        setSelectedCondo(null);
        setCurrentSessionId('');
        setMinutesTemplate(MinutesTemplate.FORMAL);
        setAppState(AppState.IDLE);
    };

    const handleCondoSelect = (condo: Condo) => {
        setCondoName(condo.nome);
        setSelectedCondo(condo);
        if (condo.logotipo_url) {
            setCondoLogo(condo.logotipo_url);
        }
        setIsCondoModalOpen(false);
        setCondoListVersion(v => v + 1);
    };

    const renderContent = () => {
        switch (appState) {
            case AppState.IDLE:
            case AppState.FILE_SELECTED:
                return (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-brand-white drop-shadow-sm">Comece por aqui</h2>
                            <p className="mt-2 text-lg text-brand-white/80">Faça o upload do vídeo ou áudio da assembleia.</p>
                        </div>

                        <FileUpload
                            onFileSelect={handleFileSelect}
                            onStart={handleStartTranscription}
                            file={mediaFile}
                            error={error}
                            disabled={false}
                            onClear={handleClearFile}
                            selectedCondo={selectedCondo}
                            onSelectCondo={() => setIsCondoModalOpen(true)}
                        />
                    </>
                );
            case AppState.TRANSCRIBING:
                return <Loader message={loadingMessage} stage={appState} progress={conversionProgress} />;
            case AppState.GENERATING:
                return <Loader message={loadingMessage} stage={appState} />;
            case AppState.TRANSCRIBED:
                return (
                    <TranscriptionView
                        transcription={transcription}
                        onGenerate={handleStartMinuteGeneration}
                        onReset={handleReset}
                        error={error}
                        minutesTemplate={minutesTemplate}
                        setMinutesTemplate={setMinutesTemplate}
                        selectedCondo={selectedCondo}
                    />
                );
            case AppState.GENERATED:
                return (
                    <MinutesView
                        minutes={minutes}
                        onReset={handleReset}
                        condoName={condoName}
                        setCondoName={setCondoName}
                        condoLogo={condoLogo}
                        setCondoLogo={setCondoLogo}
                        companyName={companyName}
                        companyLogo={companyLogo}
                        onAddCondo={() => setIsCondoModalOpen(true)}
                        onViewHistory={() => setIsMinutesHistoryOpen(true)}
                        condoListVersion={condoListVersion}
                        fileName={mediaFile?.name}
                        currentSessionId={currentSessionId}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-transparent">
            {/* Content Wrapper */}
            <div className={`relative z-10 flex flex-col min-h-screen`}>
                <Header
                    onSettingsClick={() => setIsSettingsOpen(true)}
                    onHistoryClick={() => setIsHistoryOpen(true)}
                    onCondosClick={() => setIsCondoModalOpen(true)}
                    onBillingClick={() => setIsBillingOpen(true)}
                    onSupportClick={() => setIsSupportOpen(true)}
                    onHomeClick={handleReset}
                />

                {/* Modals Section */}
                {isSettingsOpen && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        onSave={handleSaveSettings}
                        initialName={companyName}
                        initialLogo={companyLogo}
                    />
                )}

                {isHistoryOpen && (
                    <HistoryView
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                        onViewMinute={async (id) => {
                            const minute = await getMinuteById(id);
                            if (minute) {
                                setSelectedMinute(minute);
                                setIsReadOnlyOpen(true);
                            }
                        }}
                    />
                )}

                {isSupportOpen && (
                    <SupportModal
                        isOpen={isSupportOpen}
                        onClose={() => setIsSupportOpen(false)}
                    />
                )}

                {isBillingOpen && (
                    <BillingModal
                        isOpen={isBillingOpen}
                        onClose={() => setIsBillingOpen(false)}
                    />
                )}

                {isCondoModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
                        <div className="relative w-full max-w-4xl max-h-[90vh]">
                            <CondoManager
                                onSelect={handleCondoSelect}
                                onClose={() => {
                                    setIsCondoModalOpen(false);
                                    setCondoListVersion(v => v + 1);
                                }}
                            />
                        </div>
                    </div>
                )}

                {isMinutesHistoryOpen && (
                    <FullMinutesHistoryView
                        isOpen={isMinutesHistoryOpen}
                        onClose={() => setIsMinutesHistoryOpen(false)}
                        onSelect={(minute) => {
                            setMinutes(minute.minutesHtml);
                            setCondoName(minute.condoName);
                            setCondoLogo(minute.condoLogo || null);
                            setAppState(AppState.GENERATED);
                            setIsMinutesHistoryOpen(false);
                        }}
                    />
                )}

                {isReadOnlyOpen && selectedMinute && (
                    <ReadOnlyMinuteView
                        minute={selectedMinute}
                        isOpen={isReadOnlyOpen}
                        onClose={() => setIsReadOnlyOpen(false)}
                        onDuplicate={(minute) => {
                            setMinutes(minute.minutesHtml);
                            setCondoName(minute.condoName);
                            setCondoLogo(minute.condoLogo || null);
                            setAppState(AppState.GENERATED);
                            setIsReadOnlyOpen(false);
                        }}
                    />
                )}

                {/* Main Content Area */}
                <div className="flex-1 w-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
                    <main className="w-full max-w-7xl flex-1 flex flex-col items-center justify-center">
                        {renderContent()}
                    </main>
                    <footer className="w-full text-center p-4 mt-8 text-brand-white/60 text-sm">
                        <p>
                            Powered by <a href="https://automabo.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-brand-white hover:underline transition-colors">Automabo</a>
                        </p>
                    </footer>
                </div>

                {/* Drag Overlay */}
                {isDragging && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                        <div className="bg-slate-800/90 border-4 border-dashed border-brand-orange/50 rounded-3xl p-16 text-center transform scale-105 transition-transform shadow-2xl">
                            <div className="flex justify-center mb-6">
                                <div className="p-6 bg-brand-orange/20 rounded-full animate-bounce">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-4xl font-bold text-white mb-4">Solte o arquivo aqui</h2>
                            <p className="text-xl text-slate-300">Para iniciar o processamento da ata</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
