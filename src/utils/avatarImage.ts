const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 МБ
const OUTPUT_SIZE = 256; // px, итоговый квадрат
const OUTPUT_QUALITY = 0.88;

// Сигнатуры (magic bytes) поддерживаемых форматов — проверяем реальное
// содержимое файла, а не то, что браузер сообщил в file.type (это поле
// легко подделать, просто переименовав файл)
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // 'RIFF', формат уточняется на 8-м байте
];

async function detectImageMime(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const sig of SIGNATURES) {
    if (sig.bytes.every((b, i) => header[i] === b)) {
      if (sig.mime === 'image/webp') {
        // RIFF-контейнер используется не только WebP — проверяем тег 'WEBP' на смещении 8
        const tag = String.fromCharCode(header[8], header[9], header[10], header[11]);
        if (tag !== 'WEBP') continue;
      }
      return sig.mime;
    }
  }
  return null;
}

export class AvatarProcessingError extends Error {
  code: 'too_large' | 'unsupported_type' | 'read_failed';
  constructor(code: AvatarProcessingError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Готовит загруженный файл для использования как аватар:
 * - проверяет размер и реальный формат файла (по сигнатуре, не по расширению/MIME из браузера)
 * - вписывает изображение в квадрат по центру (cover-кроп по меньшей стороне)
 * - перерисовывает через <canvas> и заново кодирует в JPEG фиксированного размера
 *
 * Перекодирование через canvas — основная защита от вредоносного содержимого:
 * на выходе остаются только пиксели, любые скрипты, метаданные (EXIF) или
 * посторонние данные, вставленные в исходный файл, отбрасываются.
 */
export async function processAvatarFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AvatarProcessingError('too_large', 'File is too large');
  }

  const mime = await detectImageMime(file);
  if (!mime) {
    throw new AvatarProcessingError('unsupported_type', 'Unsupported file type');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AvatarProcessingError('read_failed', 'Canvas is not supported');

    ctx.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const dataUrl = canvas.toDataURL('image/jpeg', OUTPUT_QUALITY);
    return dataUrl.split(',')[1]; // чистый base64, как ожидает компонент Avatar
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new AvatarProcessingError('read_failed', 'Could not read image'));
    img.src = src;
  });
}