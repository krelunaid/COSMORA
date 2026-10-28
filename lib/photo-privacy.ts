/** Container-only metadata cleanup for JPEG/PNG/WebP. No pixel recompression.
 * EXIF is rebuilt with orientation only; colour profiles remain. HEIC/video
 * are deliberately outside this guarantee. Malformed supported containers fail.
 */
const encoder = new TextEncoder();
const ascii = (data: Uint8Array, from = 0, length = data.length - from) =>
  String.fromCharCode(...data.subarray(from, from + length));
const bytes = (text: string) => encoder.encode(text);
export class PhotoPrivacyError extends Error {}
const fail = (): never => { throw new PhotoPrivacyError('La foto non è valida. Esportala di nuovo come JPEG, PNG o WebP e riprova.'); };
export const MAX_PHOTO_STRUCTURE_UNITS = 4096;
export const MAX_SANITIZED_PHOTO_BATCH_BYTES = 32 * 1024 * 1024;
type ParseBudget = { remaining: number };
const budgetForRequest = (): ParseBudget => ({ remaining: MAX_PHOTO_STRUCTURE_UNITS });
function spendStructureUnit(budget: ParseBudget) {
  if (budget.remaining-- <= 0) {
    throw new PhotoPrivacyError('Le foto hanno una struttura troppo complessa. Esportale di nuovo o caricane meno alla volta.');
  }
}
const view = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength);
const concat = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};

function orientationOf(input: Uint8Array): number | undefined {
  const data = ascii(input, 0, 6) === 'Exif\0\0' ? input.subarray(6) : input;
  if (data.length < 8) fail();
  const endian = ascii(data, 0, 2);
  if (endian !== 'II' && endian !== 'MM') fail();
  const little = endian === 'II';
  const v = view(data);
  if (v.getUint16(2, little) !== 42) fail();
  const start = v.getUint32(4, little);
  if (start < 8 || start + 2 > data.length) fail();
  const count = v.getUint16(start, little);
  if (start + 2 + count * 12 + 4 > data.length) fail();
  let orientation: number | undefined;
  for (let i = 0; i < count; i++) {
    const p = start + 2 + i * 12;
    if (v.getUint16(p, little) !== 0x112) continue;
    if (v.getUint16(p + 2, little) !== 3 || v.getUint32(p + 4, little) !== 1) fail();
    const next = v.getUint16(p + 8, little);
    if (next < 1 || next > 8 || (orientation !== undefined && orientation !== next)) fail();
    orientation = next;
  }
  return orientation;
}

function mergeOrientation(current: number | undefined, data: Uint8Array) {
  const next = orientationOf(data);
  if (current !== undefined && next !== undefined && current !== next) fail();
  return next ?? current;
}

function orientationTiff(orientation: number) {
  const data = new Uint8Array(26);
  const v = view(data);
  data.set(bytes('II')); v.setUint16(2, 42, true); v.setUint32(4, 8, true);
  v.setUint16(8, 1, true); v.setUint16(10, 0x112, true);
  v.setUint16(12, 3, true); v.setUint32(14, 1, true);
  v.setUint16(18, orientation, true);
  return data;
}

function jpeg(data: Uint8Array, budget: ParseBudget) {
  if (data[0] !== 0xff || data[1] !== 0xd8) fail();
  const kept: Uint8Array[] = [];
  let p = 2, orientation: number | undefined, sawFrame = false, sawScan = false;
  while (p < data.length) {
    spendStructureUnit(budget);
    const start = p;
    if (data[p++] !== 0xff) fail();
    while (data[p] === 0xff) p++;
    if (p >= data.length) fail();
    const marker = data[p++];
    if (marker === 0xd9) {
      if (p !== data.length || !sawFrame || !sawScan) fail();
      const parts = [data.subarray(0, 2)];
      if (orientation !== undefined) {
        const payload = concat([bytes('Exif\0\0'), orientationTiff(orientation)]);
        const header = new Uint8Array([0xff, 0xe1, 0, 0]);
        view(header).setUint16(2, payload.length + 2);
        parts.push(header, payload);
      }
      return concat([...parts, ...kept, data.subarray(start, p)]);
    }
    if (marker === 0 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) fail();
    if (marker === 1) { kept.push(data.subarray(start, p)); continue; }
    if (p + 2 > data.length) fail();
    const length = view(data).getUint16(p);
    if (length < 2 || p + length > data.length) fail();
    const payload = data.subarray(p + 2, p + length);
    p += length;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) sawFrame = true;
    if (marker === 0xe1 && ascii(payload, 0, 6) === 'Exif\0\0') {
      orientation = mergeOrientation(orientation, payload);
    } else if (marker === 0xe0 && ascii(payload, 0, 5) === 'JFIF\0') {
      // Retain density/version but remove embedded thumbnails of older originals.
      if (payload.length < 14 || payload.length !== 14 + 3 * payload[12] * payload[13]) fail();
      const jfif = payload.slice(0, 14); jfif[12] = 0; jfif[13] = 0;
      kept.push(new Uint8Array([0xff, 0xe0, 0, 16]), jfif);
    } else if (marker === 0xe2 && ascii(payload, 0, 12) === 'ICC_PROFILE\0') {
      if (payload.length < 14 || payload[12] < 1 || payload[13] < payload[12]) fail();
      kept.push(data.subarray(start, p));
    } else if (marker === 0xee && ascii(payload, 0, 5) === 'Adobe') {
      if (payload.length !== 12) fail();
      kept.push(data.subarray(start, p));
    } else if (!(marker >= 0xe0 && marker <= 0xef) && marker !== 0xfe) {
      kept.push(data.subarray(start, p));
    }
    if (marker === 0xda) {
      if (!sawFrame) fail();
      sawScan = true;
      const scanStart = p;
      while (p < data.length) {
        if (data[p] !== 0xff) { p++; continue; }
        const markerStart = p;
        while (data[p] === 0xff) p++;
        if (p >= data.length) fail();
        if (data[p] === 0 || (data[p] >= 0xd0 && data[p] <= 0xd7)) { p++; continue; }
        p = markerStart;
        break;
      }
      kept.push(data.subarray(scanStart, p));
    }
  }
  return fail();
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});
function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of data) crc = (crc >>> 8) ^ crcTable[(crc ^ value) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, payload: Uint8Array) {
  const chunk = new Uint8Array(12 + payload.length);
  const v = view(chunk);
  v.setUint32(0, payload.length); chunk.set(bytes(type), 4); chunk.set(payload, 8);
  v.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)));
  return chunk;
}

const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const pngPreserved = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'cHRM', 'gAMA', 'iCCP', 'sRGB', 'sBIT', 'pHYs', 'tRNS', 'bKGD', 'acTL', 'fcTL', 'fdAT', 'cICP', 'mDCv', 'cLLi']);
function png(data: Uint8Array, budget: ParseBudget) {
  if (!pngSignature.every((value, i) => data[i] === value)) fail();
  const kept: Uint8Array[] = [];
  let p = 8, orientation: number | undefined, sawData = false;
  while (p < data.length) {
    spendStructureUnit(budget);
    if (p + 12 > data.length) fail();
    const length = view(data).getUint32(p), end = p + 12 + length;
    if (end > data.length) fail();
    const type = ascii(data, p + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase()) fail();
    if (crc32(data.subarray(p + 4, end - 4)) !== view(data).getUint32(end - 4)) fail();
    if ((p === 8 && (type !== 'IHDR' || length !== 13)) || (p !== 8 && type === 'IHDR')) fail();
    if (type === 'IHDR' && (!view(data).getUint32(p + 8) || !view(data).getUint32(p + 12))) fail();
    if (type === 'IDAT') sawData = true;
    if (type === 'eXIf') orientation = mergeOrientation(orientation, data.subarray(p + 8, end - 4));
    else if (pngPreserved.has(type)) kept.push(data.subarray(p, end));
    else if (type[0] === type[0].toUpperCase()) fail();
    p = end;
    if (type === 'IEND') {
      if (length !== 0 || p !== data.length || !sawData) fail();
      return concat([pngSignature, kept[0], ...(orientation === undefined ? [] : [pngChunk('eXIf', orientationTiff(orientation))]), ...kept.slice(1)]);
    }
  }
  return fail();
}

function riffChunk(type: string, payload: Uint8Array) {
  const result = new Uint8Array(8 + payload.length + (payload.length % 2));
  result.set(bytes(type)); view(result).setUint32(4, payload.length, true); result.set(payload, 8);
  return result;
}

function riffChunks(data: Uint8Array, start: number, budget: ParseBudget) {
  const chunks: { type: string; payload: Uint8Array }[] = [];
  let p = start;
  while (p < data.length) {
    // Count even discarded/unknown chunks before adding any allocation to the list.
    spendStructureUnit(budget);
    if (p + 8 > data.length) fail();
    const length = view(data).getUint32(p + 4, true), end = p + 8 + length;
    if (end + length % 2 > data.length || (length % 2 && data[end] !== 0)) fail();
    chunks.push({ type: ascii(data, p, 4), payload: data.subarray(p + 8, end) });
    p = end + length % 2;
  }
  return chunks;
}

function webp(data: Uint8Array, budget: ParseBudget) {
  if (data.length < 20 || ascii(data, 0, 4) !== 'RIFF' || ascii(data, 8, 4) !== 'WEBP' || view(data).getUint32(4, true) !== data.length - 8) fail();
  const chunks = riffChunks(data, 12, budget), kept: Uint8Array[] = [];
  let orientation: number | undefined, extended: Uint8Array | undefined, sawPixels = false;
  for (const [index, { type, payload }] of chunks.entries()) {
    if (type === 'EXIF') orientation = mergeOrientation(orientation, payload);
    else if (type === 'VP8X') {
      if (extended || index !== 0 || payload.length !== 10 || (payload[0] & 0xc1) || payload[1] || payload[2] || payload[3]) fail();
      extended = payload.slice(); kept.push(riffChunk(type, extended));
    } else if (type === 'ANMF') {
      if (!extended || payload.length < 24) fail();
      const frames = riffChunks(payload, 16, budget), frameParts: Uint8Array[] = [];
      let framePixels = 0;
      for (const frame of frames) {
        if (frame.type === 'VP8 ' || frame.type === 'VP8L') framePixels++;
        if (['ALPH', 'VP8 ', 'VP8L'].includes(frame.type)) frameParts.push(riffChunk(frame.type, frame.payload));
      }
      if (framePixels !== 1) fail();
      kept.push(riffChunk(type, concat([payload.subarray(0, 16), ...frameParts]))); sawPixels = true;
    } else if (['ICCP', 'ANIM', 'ALPH', 'VP8 ', 'VP8L'].includes(type)) {
      if (['ICCP', 'ANIM', 'ALPH'].includes(type) && !extended) fail();
      if (type === 'VP8 ' || type === 'VP8L') { if (!payload.length) fail(); sawPixels = true; }
      if (type === 'ANIM' && payload.length !== 6) fail();
      kept.push(riffChunk(type, payload));
    }
  }
  if (!sawPixels || (orientation !== undefined && !extended)) fail();
  if (extended) {
    extended[0] = (extended[0] & ~0x0c) | (orientation === undefined ? 0 : 0x08);
    kept[0] = riffChunk('VP8X', extended);
  }
  if (orientation !== undefined) kept.push(riffChunk('EXIF', orientationTiff(orientation)));
  const body = concat([bytes('WEBP'), ...kept]), header = new Uint8Array(8);
  header.set(bytes('RIFF')); view(header).setUint32(4, body.length, true);
  return concat([header, body]);
}

function sanitizeWithBudget(data: Uint8Array, contentType: string, budget: ParseBudget): Uint8Array<ArrayBuffer> {
  if (['image/jpeg', 'image/jpg', 'image/pjpeg'].includes(contentType)) return jpeg(data, budget);
  if (contentType === 'image/png') return png(data, budget);
  if (contentType === 'image/webp') return webp(data, budget);
  throw new Error('Formato non supportato dalla pulizia dei metadati.');
}

export function sanitizePhotoBytes(data: Uint8Array, contentType: string): Uint8Array<ArrayBuffer> {
  if (data.length > MAX_SANITIZED_PHOTO_BATCH_BYTES) throw new PhotoPrivacyError('Prepara un gruppo di foto di massimo 32 MB.');
  return sanitizeWithBudget(data, contentType, budgetForRequest());
}

export async function sanitizePhotoUploads(files: File[], contentTypes: string[] = files.map(file => file.type)): Promise<File[]> {
  if (files.length !== contentTypes.length) fail();
  const photoTypes = new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp']);
  const totalPhotoBytes = files.reduce((total, file, index) => total + (photoTypes.has(contentTypes[index]) ? file.size : 0), 0);
  // Bound extra buffers before arrayBuffer()/copying. Original multipart parsing is
  // governed by the hosting service; this is not a replacement for its body limit.
  if (totalPhotoBytes > MAX_SANITIZED_PHOTO_BATCH_BYTES) throw new PhotoPrivacyError('Prepara un gruppo di foto di massimo 32 MB.');
  const budget = budgetForRequest();
  const sanitized: File[] = [];
  for (const [index, file] of files.entries()) {
    const type = contentTypes[index];
    if (!photoTypes.has(type)) {
      const prefix = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      // Do not allow JPEG/PNG/WebP metadata to bypass cleanup via a video/HEIC label.
      if ((prefix[0] === 0xff && prefix[1] === 0xd8) || pngSignature.every((v, i) => prefix[i] === v) ||
          (ascii(prefix, 0, 4) === 'RIFF' && ascii(prefix, 8, 4) === 'WEBP')) fail();
      // HEIC/HEIF and video keep their existing behaviour. Never label them sanitized.
      sanitized.push(file); continue;
    }
    const clean = sanitizeWithBudget(new Uint8Array(await file.arrayBuffer()), type, budget);
    const canonicalType = type === 'image/png' || type === 'image/webp' ? type : 'image/jpeg';
    const extension = canonicalType === 'image/jpeg' ? 'jpg' : canonicalType.slice(6);
    sanitized.push(new File([clean.buffer], `photo.${extension}`, { type: canonicalType, lastModified: file.lastModified }));
  }
  return sanitized;
}
