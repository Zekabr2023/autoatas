import { io, Socket } from 'socket.io-client';
import { encryptApiKey } from '../utils/crypto';

// Resolve backend URL:
// 1) Prefer env var VITE_BACKEND_URL if set
// 2) Otherwise, use current origin swapping the port for 3001
const envBackend = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
const FRONTEND_ORIGIN = window.location.origin;
const computedOrigin = FRONTEND_ORIGIN.includes('localhost')
    ? 'http://localhost:3001'
    : FRONTEND_ORIGIN.replace(/:\d+$/, ':3001');
export const BACKEND_URL = (envBackend ? envBackend.replace(/\/$/, '') : computedOrigin);

interface TranscriptionProgress {
    percentage: number;
    stage?: string;
    timeProcessed?: number;
    totalDuration?: number;
    estimatedTimeRemaining?: number;
}

interface TranscriptionResult {
    transcription: string;
    usageMetadata?: object;
}

/**
 * Upload media file (audio or video) to backend for transcription.
 * All processing happens on the backend - video is converted to audio, then transcribed.
 */
export async function transcribeMedia(
    file: File,
    apiKey: string,
    onProgress: (progress: TranscriptionProgress) => void
): Promise<TranscriptionResult> {

    return new Promise((resolve, reject) => {
        // Connect to Socket.IO for progress updates
        const socket: Socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', async () => {
            console.log('Connected to backend:', socket.id);

            // Listen for conversion progress (for videos)
            socket.on('conversion-progress', (data: TranscriptionProgress) => {
                console.log('Conversion progress:', data);
                onProgress({ ...data, stage: 'Convertendo vídeo para áudio...' });
            });

            // Listen for transcription progress
            socket.on('transcription-progress', (data: TranscriptionProgress) => {
                console.log('Transcription progress:', data);
                onProgress({ ...data, stage: data.stage || 'Transcrevendo...' });
            });

            try {
                // Prepare form data
                const formData = new FormData();
                formData.append('media', file);
                formData.append('socketId', socket.id!);

                // Encrypt and send API key
                const encryptedKey = await encryptApiKey(apiKey);
                formData.append('encryptedApiKey', encryptedKey);

                // Use XMLHttpRequest instead of fetch to track upload progress
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${BACKEND_URL}/api/transcribe-media`, true);

                // Track upload progress
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        // Map upload progress to 0-30% of total flow
                        // Upload is just step 1. Processing is the rest.
                        const displayProgress = Math.min(30, Math.round((percentComplete / 100) * 30));
                        onProgress({
                            percentage: displayProgress,
                            stage: `Enviando arquivo para o servidor (${Math.round(percentComplete)}%)...`
                        });
                    }
                };

                xhr.onload = async () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            socket.disconnect();

                            if (data.transcription) {
                                resolve({
                                    transcription: data.transcription,
                                    usageMetadata: data.usageMetadata,
                                });
                            } else {
                                reject(new Error('Servidor não retornou transcrição'));
                            }
                        } catch (e) {
                            reject(new Error('Erro ao processar resposta do servidor'));
                        }
                    } else {
                        let errorMsg = 'Erro ao processar arquivo';
                        try {
                            const errData = JSON.parse(xhr.responseText);
                            if (errData.error) errorMsg = errData.error;
                        } catch (e) { }
                        socket.disconnect();
                        reject(new Error(errorMsg));
                    }
                };

                xhr.onerror = () => {
                    socket.disconnect();
                    reject(new Error('Falha na conexão de upload'));
                };

                xhr.send(formData);

            } catch (error) {
                console.error('Media transcription error:', error);
                socket.disconnect();
                reject(error);
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            reject(new Error('Não foi possível conectar ao servidor de processamento'));
        });
    });
}

/**
 * Generate meeting minutes via backend (uses encrypted API key)
 */
export async function generateMinutesViaBackend(
    transcription: string,
    condoName: string,
    template: string,
    apiKey: string,
    meetingDetails?: any
): Promise<{ minutes: string; usageMetadata?: object }> {
    const encryptedKey = await encryptApiKey(apiKey);

    const response = await fetch(`${BACKEND_URL}/api/generate-minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            transcription,
            condoName,
            template,
            encryptedApiKey: encryptedKey,
            meetingDetails
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error || 'Erro ao gerar ata');
    }

    const data = await response.json();
    return {
        minutes: data.minutes,
        usageMetadata: data.usageMetadata,
    };
}

// Legacy export for backwards compatibility (deprecated)
export const uploadAndConvertVideo = transcribeMedia;
