import crypto from 'crypto';

/**
 * Returns the encryption key hex from env variables.
 */
const getSecretKey = (customKeyHex?: string): string => {
  const hex = customKeyHex || process.env.SESSION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("La clé de chiffrement SESSION_ENCRYPTION_KEY est manquante dans le .env.");
  }
  return hex;
};

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: "iv:ciphertext:authTag"
 */
export function encrypt(text: string, secretKeyHex?: string): string {
  const hexKey = getSecretKey(secretKeyHex);
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error('La clé de chiffrement SESSION_ENCRYPTION_KEY doit faire exactement 32 octets (64 caractères hexadécimaux).');
  }

  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a colon-separated ciphertext "iv:ciphertext:authTag" using AES-256-GCM.
 */
export function decrypt(encryptedText: string, secretKeyHex?: string): string {
  const hexKey = getSecretKey(secretKeyHex);
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new Error('La clé de chiffrement SESSION_ENCRYPTION_KEY doit faire exactement 32 octets (64 caractères hexadécimaux).');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Format de chaîne chiffrée invalide. Attendu "iv:ciphertext:authTag".');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
