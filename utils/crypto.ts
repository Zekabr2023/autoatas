// Encryption key from environment variable (32 bytes for AES-256)
// In production, set this via VITE_ENCRYPTION_KEY environment variable
const ENCRYPTION_KEY = (import.meta as any).env?.VITE_ENCRYPTION_KEY || 'AutoatasSecureEncryptionKey2024!'; // Exactly 32 chars

/**
 * Encrypt an API key using AES-256-GCM
 * @param apiKey - The API key to encrypt
 * @returns Base64 encoded string containing IV + AuthTag + Ciphertext
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    // Encrypt the API key
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encoder.encode(apiKey)
    );

    // Combine IV + Ciphertext (GCM automatically appends auth tag to ciphertext)
    // Web Crypto API returns ciphertext with auth tag appended (last 16 bytes)
    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const actualCiphertext = ciphertextArray.slice(0, -16);

    // Format: IV (12) + AuthTag (16) + Ciphertext (variable)
    const combined = new Uint8Array(12 + 16 + actualCiphertext.length);
    combined.set(iv, 0);
    combined.set(authTag, 12);
    combined.set(actualCiphertext, 28);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
}

/**
 * Check if using default encryption key (for development warning)
 */
export function isUsingDefaultKey(): boolean {
    return !(import.meta as any).env?.VITE_ENCRYPTION_KEY;
}
