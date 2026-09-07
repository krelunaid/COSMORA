import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm';

// Executed only after the user confirms. A dedicated worker keeps navigation
// responsive and can be terminated to cancel downloads or inference on iOS.
self.onmessage = async (
  event: MessageEvent<{ input: Float32Array; origin: string }>,
) => {
  let session: InferenceSession | undefined;
  try {
    env.wasm.numThreads = 1;
    env.wasm.proxy = false;
    env.wasm.wasmPaths = {
      wasm: `${event.data.origin}/models/u2netp/ort-wasm-simd-threaded.wasm`,
      mjs: `${event.data.origin}/models/u2netp/ort-wasm-simd-threaded.mjs`,
    };
    self.postMessage({ phase: 'cutDownload' });
    const response = await fetch(
      `${event.data.origin}/models/u2netp/model.onnx`,
    );
    if (!response.ok) throw new Error('Model unavailable');
    const model = await response.arrayBuffer();
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', model)),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    if (
      digest !==
      '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8'
    )
      throw new Error('Invalid model');
    session = await InferenceSession.create(model, {
      executionProviders: ['wasm'],
    });
    self.postMessage({ phase: 'cutting' });
    const input = new Tensor('float32', event.data.input, [1, 3, 320, 320]);
    const outputs = await session.run({ [session.inputNames[0]]: input });
    const mask = new Float32Array(
      outputs[session.outputNames[0]].data as Float32Array,
    );
    self.postMessage({ mask });
    input.dispose();
    for (const output of Object.values(outputs)) output.dispose();
  } catch (error) {
    console.warn(
      'Local cutout engine failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    self.postMessage({ error: true });
  } finally {
    await session?.release();
  }
};
