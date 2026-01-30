import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { convertVideoToAudio } from './ffmpegConverter.js';
import { decryptApiKey, isUsingDefaultKey } from './crypto.js';
import { transcribeAudio, generateMinutes } from './geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
// CORS origin: use env var in production, or allow localhost in dev
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST']
    }
});

// Middleware - Configure CORS to allow any origin (useful for local network access)
app.use(cors({
    origin: true, // Reflects the request origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Increased for large transcriptions

// Create temp directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');

await fs.mkdir(uploadsDir, { recursive: true });
await fs.mkdir(outputsDir, { recursive: true });

// Log security warning if using default encryption key
if (isUsingDefaultKey()) {
    console.warn('⚠️ WARNING: Using default encryption key. Set ENCRYPTION_KEY env var in production!');
}

// Serve converted audio files with explicit CORS headers
app.use('/outputs', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use('/outputs', express.static(outputsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 2048 // 2GB max
    },
    fileFilter: (req, file, cb) => {
        const allowedVideoMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
        const allowedAudioMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
        if (allowedVideoMimes.includes(file.mimetype) || allowedAudioMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato não suportado. Use MP4, MOV, AVI, MKV, WebM, MP3, WAV ou M4A.'));
        }
    }
});

// Unified media transcription endpoint (accepts audio or video)
app.post('/api/transcribe-media', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const socketId = req.body.socketId;
    const encryptedApiKey = req.body.encryptedApiKey;
    const isVideo = req.file.mimetype.startsWith('video/');

    if (!encryptedApiKey) {
        // Cleanup
        try { await fs.unlink(filePath); } catch (e) { }
        return res.status(400).json({ error: 'API Key é obrigatória' });
    }

    try {
        const apiKey = decryptApiKey(encryptedApiKey);
        let audioPath = filePath;

        // If it's a video, convert to audio first
        if (isVideo) {
            const outputFilename = `audio-${Date.now()}.mp3`;
            audioPath = path.join(outputsDir, outputFilename);

            // Create progress emitter
            const progressEmitter = new EventEmitter();
            progressEmitter.on('progress', (data) => {
                if (socketId) {
                    io.to(socketId).emit('conversion-progress', data);
                }
            });

            console.log(`🎬 Convertendo vídeo para áudio: ${filePath} -> ${audioPath}`);
            await convertVideoToAudio(filePath, audioPath, progressEmitter);

            // Cleanup original video file
            await fs.unlink(filePath);
        }

        // Transcription progress callback
        const transcriptionProgress = (data) => {
            if (socketId) {
                io.to(socketId).emit('transcription-progress', data);
            }
        };

        console.log(`🎙️ Iniciando transcrição: ${audioPath}`);
        const result = await transcribeAudio(audioPath, apiKey, transcriptionProgress);

        // Cleanup audio file after transcription
        try { await fs.unlink(audioPath); } catch (e) { }

        return res.json({
            success: true,
            transcription: result.text,
            usageMetadata: result.usageMetadata,
        });

    } catch (error) {
        console.error('Transcription error:', error);

        // Cleanup on error
        try { await fs.unlink(filePath); } catch (e) { }

        res.status(500).json({
            error: error.message || 'Erro ao processar arquivo',
        });
    }
});

// Video conversion endpoint (legacy - kept for backwards compatibility)
app.post('/api/convert-video', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const videoPath = req.file.path;
    const outputFilename = `audio-${Date.now()}.mp3`;
    const outputPath = path.join(outputsDir, outputFilename);
    const socketId = req.body.socketId;
    const shouldTranscribe = req.body.transcribe === 'true';
    const encryptedApiKey = req.body.encryptedApiKey;

    try {
        // Create progress emitter
        const progressEmitter = new EventEmitter();

        // Send progress updates via Socket.IO
        progressEmitter.on('progress', (data) => {
            if (socketId) {
                io.to(socketId).emit('conversion-progress', data);
            }
        });

        // Convert video to audio
        await convertVideoToAudio(videoPath, outputPath, progressEmitter);

        // Cleanup: delete uploaded video file
        await fs.unlink(videoPath);

        // If transcription requested, do it now
        if (shouldTranscribe && encryptedApiKey) {
            try {
                const apiKey = decryptApiKey(encryptedApiKey);

                // Send transcription progress
                const transcriptionProgress = (data) => {
                    if (socketId) {
                        io.to(socketId).emit('transcription-progress', data);
                    }
                };

                const result = await transcribeAudio(outputPath, apiKey, transcriptionProgress);

                // Cleanup audio file after transcription
                await fs.unlink(outputPath);

                return res.json({
                    success: true,
                    transcription: result.text,
                    usageMetadata: result.usageMetadata,
                });
            } catch (transcribeError) {
                console.error('Transcription error:', transcribeError);
                // Still return the audio URL so user can retry or download
                return res.json({
                    success: true,
                    audioUrl: `/outputs/${outputFilename}`,
                    filename: outputFilename,
                    transcriptionError: transcribeError.message,
                });
            }
        }

        // Send success response with download URL (no transcription)
        res.json({
            success: true,
            audioUrl: `/outputs/${outputFilename}`,
            audioPath: outputPath,
            filename: outputFilename
        });

        // Schedule cleanup of output file after 1 hour
        setTimeout(async () => {
            try {
                await fs.unlink(outputPath);
                console.log(`Cleaned up: ${outputFilename}`);
            } catch (err) {
                // File may already be deleted if transcription was done
            }
        }, 60 * 60 * 1000);

    } catch (error) {
        console.error('Conversion error:', error);

        // Cleanup on error
        try {
            await fs.unlink(videoPath);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
        }

        res.status(500).json({
            error: 'Erro ao converter vídeo',
            message: error.message
        });
    }
});

// Standalone transcription endpoint (for audio files already on server)
app.post('/api/transcribe', async (req, res) => {
    const { audioPath, encryptedApiKey } = req.body;

    if (!audioPath || !encryptedApiKey) {
        return res.status(400).json({ error: 'audioPath and encryptedApiKey are required' });
    }

    try {
        const apiKey = decryptApiKey(encryptedApiKey);
        const result = await transcribeAudio(audioPath, apiKey, null);

        res.json({
            success: true,
            transcription: result.text,
            usageMetadata: result.usageMetadata,
        });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Minutes generation endpoint
app.post('/api/generate-minutes', async (req, res) => {
    const { transcription, condoName, template, encryptedApiKey } = req.body;

    if (!transcription || !encryptedApiKey) {
        return res.status(400).json({ error: 'transcription and encryptedApiKey are required' });
    }

    try {
        const apiKey = decryptApiKey(encryptedApiKey);
        console.log(`📝 Gerando ata - Transcrição: ${transcription.length} chars, Template: ${template || 'formal'}`);
        const result = await generateMinutes(transcription, condoName, template || 'formal', apiKey);

        res.json({
            success: true,
            minutes: result.text,
            usageMetadata: result.usageMetadata,
        });
    } catch (error) {
        console.error('Minutes generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`🎬 FFmpeg video conversion service ready`);
});

// Calculate adequate timeout (e.g., 30 minutes)
const TIMEOUT_MS = 30 * 60 * 1000;
httpServer.keepAliveTimeout = TIMEOUT_MS;
httpServer.headersTimeout = TIMEOUT_MS + 1000;
httpServer.requestTimeout = TIMEOUT_MS;
