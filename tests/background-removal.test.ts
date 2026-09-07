import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  prepareCutoutInput,
  cutoutMask,
} from '../lib/background-removal-math.ts';

test('cutout preprocessing is planar RGB and finite for a black photo', () => {
  const input = prepareCutoutInput(
    new Uint8ClampedArray([0, 0, 0, 255, 255, 128, 0, 255]),
  );
  assert.equal(input.length, 6);
  assert.ok(Math.abs(input[1] - (1 - 0.485) / 0.229) < 0.0001);
  assert.ok(
    prepareCutoutInput(new Uint8ClampedArray(8)).every(Number.isFinite),
  );
});
test('mask provides transparent background and opaque foreground', () => {
  assert.deepEqual(
    [...cutoutMask(new Float32Array([0.2, 0.6, 1]))],
    [0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 255],
  );
  assert.throws(() => cutoutMask(new Float32Array([1, 1])));
  assert.throws(() => cutoutMask(new Float32Array([NaN, 1])));
});
test('model integrity and total offline assets fit the displayed 17 MB budget', () => {
  const model = readFileSync('public/models/u2netp/model.onnx');
  assert.equal(
    createHash('sha256').update(model).digest('hex'),
    '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
  );
  const wasm = readFileSync('public/models/u2netp/ort-wasm-simd-threaded.wasm');
  assert.ok(model.length + wasm.length + 1_000_000 < 17_000_000);
});
test('removal is consent-gated, cancellable, and no longer calls paid API', () => {
  const source = readFileSync('app/sell/page.tsx', 'utf8');
  assert.ok(source.includes('setCutRequest(photo.id)'));
  assert.ok(source.includes("await import('@/lib/background-removal-client')"));
  assert.ok(source.includes("t('cutDownloadInfo')"));
  assert.ok(source.includes('cutJob.current?.abort()'));
  assert.ok(!source.includes("fetch('/api/images/remove-background'"));
});
