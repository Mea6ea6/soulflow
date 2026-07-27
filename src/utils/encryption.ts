import { encryptData, decryptData } from '../hooks/useEncryption';

export async function encryptObject<T>(data: T, key: CryptoKey): Promise<string> {
  return encryptData(JSON.stringify(data), key);
}

export async function decryptObject<T>(encrypted: string, key: CryptoKey): Promise<T> {
  const json = await decryptData(encrypted, key);
  return JSON.parse(json) as T;
}