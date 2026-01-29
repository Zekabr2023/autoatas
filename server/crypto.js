import crypto from 'crypto';

// Encryption key from environment variable (32 bytes for AES-256)
// In production, set this via environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'AutoatasSecureEncryptionKey2024!'; // Exactly 32 chars

/**
 * Decrypt an encrypted API key
 * @param {string} encryptedData - Base64 encoded string containing IV + AuthTag + Ciphertext
 * @returns {string} - Decrypted API key
 */
export function decryptApiKey(encryptedData) {
    try {
        const buffer = Buffer.from(encryptedData, 'base64');

        // Extract IV (first 12 bytes), AuthTag (next 16 bytes), and Ciphertext (rest)
        const iv = buffer.subarray(0, 12);
        const authTag = buffer.subarray(12, 28);
        const ciphertext = buffer.subarray(28);

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(ENCRYPTION_KEY, 'utf-8'),
            iv
        );
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        throw new Error('Failed to decrypt API key');
    }
}

/**
 * Check if the encryption key is the default one (for development warning)
 */
export function isUsingDefaultKey() {
    return !process.env.ENCRYPTION_KEY;
}
