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

                onProgress({ percentage: 5, stage: 'Enviando arquivo para o servidor...' });

                // Upload media to unified endpoint
                const response = await fetch(`${BACKEND_URL}/api/transcribe-media`, {
                    method: 'POST',
                    body: formData,
                });

                socket.disconnect();

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(error.error || 'Erro ao processar arquivo');
                }

                const data = await response.json();

                if (data.transcription) {
                    resolve({
                        transcription: data.transcription,
                        usageMetadata: data.usageMetadata,
                    });
                } else {
                    throw new Error('Servidor não retornou transcrição');
                }

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
