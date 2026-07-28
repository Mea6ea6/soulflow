// src/utils/reencrypt.ts
import { db } from '../db/database';
import { decryptData, encryptData } from '../hooks/useEncryption';

export async function reencryptAllRecords(oldKey: CryptoKey, newKey: CryptoKey): Promise<void> {
  const tables = [db.clients, db.documents, db.calendarEvents];

  for (const table of tables) {
    const records = await table.toArray();
    for (const record of records) {
      const decrypted = await decryptData(record.encryptedData, oldKey);
      const reencrypted = await encryptData(decrypted, newKey);
      await table.update(record.id, { encryptedData: reencrypted });
    }
  }
}