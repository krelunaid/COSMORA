import { prepareCutoutInput, cutoutMask } from './background-removal-math';

export async function removeBackgroundLocally(
  file: File,
  signal: AbortSignal,
  onPhase: (phase: 'cutDownload' | 'cutting') => void,
): Promise<Blob> {
  signal.throwIfAborted();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, 320, 320);
    const input = prepareCutoutInput(ctx.getImageData(0, 0, 320, 320).data);
    const mask = await new Promise<Float32Array>((resolve, reject) => {
      const worker = new Worker(
        new URL('./background-removal.worker.ts', import.meta.url),
        { type: 'module' },
      );
      const finish = (error?: Error, result?: Float32Array) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        worker.terminate();
        if (error) reject(error);
        else resolve(result!);
      };
      const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('Timed out')), 120_000);
      signal.addEventListener('abort', abort, { once: true });
      worker.onerror = () => finish(new Error('Worker failed'));
      worker.onmessage = (
        event: MessageEvent<{
          phase?: 'cutDownload' | 'cutting';
          mask?: Float32Array;
          error?: boolean;
        }>,
      ) => {
        if (event.data.error) finish(new Error('Background removal failed'));
        else if (event.data.mask) finish(undefined, event.data.mask);
        else if (event.data.phase) onPhase(event.data.phase);
      };
      worker.postMessage({ input, origin: location.origin }, [input.buffer]);
    });
    signal.throwIfAborted();
    if (mask.length !== 320 * 320) throw new Error('Invalid mask size');
    ctx.putImageData(new ImageData(cutoutMask(mask), 320, 320), 0, 0);
    const output = document.createElement('canvas');
    const scale = Math.min(
      1,
      2048 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    output.width = Math.max(1, Math.round(image.naturalWidth * scale));
    output.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const result = output.getContext('2d');
    if (!result) throw new Error('Canvas unavailable');
    result.drawImage(image, 0, 0, output.width, output.height);
    result.globalCompositeOperation = 'destination-in';
    result.drawImage(canvas, 0, 0, output.width, output.height);
    return await new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG failed'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
