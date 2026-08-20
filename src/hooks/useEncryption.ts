const PBKDF2_ITERATIONS = 600_000;
const IV_LENGTH = 12;
const DATA_KEY_ALG = { name: 'AES-GCM', length: 256 };

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return uint8ArrayToBase64(combined);
}

export async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = base64ToUint8Array(encryptedBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

// ===== Ключ данных (DEK) и его "оборачивание" другими ключами (KEK) =====

export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(DATA_KEY_ALG, true, ['encrypt', 'decrypt']);
}

async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

async function importKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, DATA_KEY_ALG, true, ['encrypt', 'decrypt']);
}

export async function wrapDataKey(dataKey: CryptoKey, kek: CryptoKey): Promise<string> {
  const raw = await exportKeyRaw(dataKey);
  return encryptData(uint8ArrayToBase64(raw), kek);
}

export async function unwrapDataKey(wrapped: string, kek: CryptoKey): Promise<CryptoKey> {
  const rawStr = await decryptData(wrapped, kek);
  return importKeyRaw(base64ToUint8Array(rawStr));
}

// Экспорт/импорт "сырого" DEK для временного хранения в sessionStorage —
// позволяет пережить обновление страницы (F5) без повторного ввода пароля,
// но исчезает при закрытии вкладки/браузера (в отличие от localStorage).
// Это осознанный компромисс между удобством и моделью "нулевого знания" —
// пока вкладка открыта, ключ технически доступен любому JS на странице
export async function exportDataKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await exportKeyRaw(key);
  return uint8ArrayToBase64(raw);
}

export async function importDataKeyFromBase64(base64: string): Promise<CryptoKey> {
  return importKeyRaw(base64ToUint8Array(base64));
}

// ===== Утилиты base64 =====

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}