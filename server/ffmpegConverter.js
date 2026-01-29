import ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { execSync } from 'child_process';

// Force explicit FFmpeg path detection
// Force explicit FFmpeg path detection
let ffmpegPath = 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe'; // Default Chocolatey path

// Try to find FFmpeg dynamically
try {
    // Try 'where' first (Windows native)
    try {
        const wherePath = execSync('where ffmpeg', { encoding: 'utf-8' }).toString().trim().split('\n')[0].trim();
        if (wherePath) {
            ffmpegPath = wherePath;
            console.log('🔍 Found FFmpeg via where:', ffmpegPath);
        }
    } catch (e) {
        // Try 'which' (Git Bash/Unix)
        try {
            const whichPath = execSync('which ffmpeg', { encoding: 'utf-8' }).toString().trim();
            if (whichPath) {
                // Convert Git Bash path (/c/...) to Windows path (C:\...) if needed
                if (whichPath.startsWith('/') && process.platform === 'win32') {
                    // Handle /c/ or /C/ drive notation
                    const driveMatch = whichPath.match(/^\/([a-zA-Z])\/(.*)/);
                    if (driveMatch) {
                        ffmpegPath = `${driveMatch[1].toUpperCase()}:\\${driveMatch[2].replace(/\//g, '\\')}`;
                        if (!ffmpegPath.endsWith('.exe')) ffmpegPath += '.exe';
                    } else {
                        ffmpegPath = whichPath;
                    }
                } else {
                    ffmpegPath = whichPath;
                }
                console.log('🔍 Found FFmpeg via which (converted):', ffmpegPath);
            }
        } catch (e2) {
            console.log('ℹ️ Using default Chocolatey path:', ffmpegPath);
        }
    }
} catch (err) {
    console.log('ℹ️ Error detecting FFmpeg, using default:', ffmpegPath);
}

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);
console.log('✅ FFmpeg configured at:', ffmpegPath);

/**
 * Converts video to audio using FFmpeg
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to output audio file
 * @param {EventEmitter} progressEmitter - Event emitter for progress updates
 * @returns {Promise<void>}
 */
export async function convertVideoToAudio(inputPath, outputPath, progressEmitter) {
    console.log('🎬 Starting conversion:', inputPath, '->', outputPath);

    return new Promise((resolve, reject) => {
        // First, get video duration using ffprobe
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            let duration = 0;

            if (err) {
                console.warn('⚠️ FFprobe warning (duration might be missing):', err.message);
            } else {
                duration = metadata.format.duration;
                console.log('⏱️ Video duration:', duration, 'seconds');
            }

            // Now start the conversion
            try {
                const command = ffmpeg(inputPath);

                console.log('📹 FFmpeg command created successfully');

                command
                    .output(outputPath)
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .format('mp3')
                    // Track progress
                    .on('progress', (progress) => {
                        if (duration > 0 && progress.timemark) {
                            // Parse timemark (format: HH:MM:SS.ms)
                            const timeParts = progress.timemark.split(':');
                            const seconds =
                                parseInt(timeParts[0]) * 3600 +
                                parseInt(timeParts[1]) * 60 +
                                parseFloat(timeParts[2]);

                            const percentage = Math.min(Math.round((seconds / duration) * 100), 100);

                            progressEmitter.emit('progress', {
                                percentage,
                                timeProcessed: seconds,
                                totalDuration: duration,
                                estimatedTimeRemaining: Math.max(0, duration - seconds)
                            });

                            // Log less frequently
                            if (percentage % 10 === 0) {
                                console.log(`📊 Progress: ${percentage}%`);
                            }
                        }
                    })
                    .on('end', () => {
                        console.log('✅ Conversion completed successfully');
                        progressEmitter.emit('progress', { percentage: 100 });
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('❌ FFmpeg conversion error:', err);
                        reject(new Error(`Erro na conversão: ${err.message}`));
                    })
                    .run();
            } catch (err) {
                console.error('❌ Error creating FFmpeg command:', err);
                reject(new Error(`Erro ao inicializar FFmpeg: ${err.message}`));
            }
        });
    });
}
