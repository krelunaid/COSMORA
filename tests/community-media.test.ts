import assert from 'node:assert/strict';
import test from 'node:test';

import {
  communityMediaSelectionError,
  inferCommunityMediaType,
  inferNativeMediaFormat,
  isAllowedCommunityMediaFile,
  isHeicLike,
  isNativePickerCancel,
  shouldFallbackToHtmlFilePicker,
  sniffCommunityMediaType,
} from '../lib/community-media.ts';
import {
  applyNativeCapacitorClass,
  detectNativeCapacitorApp,
  NATIVE_CAPACITOR_CLASS,
} from '../lib/native-app.ts';

void test('accepts typical iPhone HEIC metadata', () => {
  const heic = { name: 'IMG_1234.HEIC', type: 'image/heic', size: 2_000_000 };
  assert.equal(isHeicLike(heic), true);
  assert.equal(inferCommunityMediaType(heic), 'image/heic');
  assert.equal(isAllowedCommunityMediaFile(heic), true);
});

void test('accepts HEIF and empty MIME from the file extension', () => {
  const heif = { name: 'photo.heif', type: '', size: 800_000 };
  assert.equal(inferCommunityMediaType(heif), 'image/heif');
  assert.equal(isAllowedCommunityMediaFile(heif), true);
});

void test('sniffs HEIC ftyp brands when the browser omits the MIME type', () => {
  const header = new Uint8Array([
    0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
  ]);
  assert.equal(sniffCommunityMediaType(header), 'image/heic');
});

void test('keeps jpeg/png/webp and rejects oversized files', () => {
  assert.equal(
    isAllowedCommunityMediaFile({
      name: 'shot.jpg',
      type: 'image/jpeg',
      size: 1_000,
    }),
    true,
  );
  assert.equal(
    isAllowedCommunityMediaFile({
      name: 'huge.heic',
      type: 'image/heic',
      size: 26 * 1024 * 1024,
    }),
    false,
  );
  assert.equal(
    communityMediaSelectionError([
      { name: 'shot.jpg', type: 'image/jpeg', size: 1_000 },
    ]),
    null,
  );
});

void test('treats user-cancel camera errors as cancel, not fallback', () => {
  assert.equal(
    isNativePickerCancel(new Error('User cancelled photos app')),
    true,
  );
  assert.equal(
    isNativePickerCancel({ code: 'OS-PLUG-CAMR-0020', message: 'canceled' }),
    true,
  );
  assert.equal(
    isNativePickerCancel({ code: 'OS-PLUG-CAMR-0005', message: 'permission' }),
    false,
  );
  assert.equal(
    shouldFallbackToHtmlFilePicker({
      error: { code: 'OS-PLUG-CAMR-0018', message: 'gallery failed' },
    }),
    true,
  );
  assert.equal(
    shouldFallbackToHtmlFilePicker({
      error: { code: 'OS-PLUG-CAMR-0020', message: 'canceled' },
    }),
    false,
  );
  assert.equal(shouldFallbackToHtmlFilePicker({ nativeResult: null }), true);
  assert.equal(shouldFallbackToHtmlFilePicker({ nativeResult: [] }), false);
});

void test('infers HEIC from sniffed bytes when gallery metadata is missing', () => {
  assert.equal(
    inferNativeMediaFormat({ sniffedType: 'image/heic', blobType: '' }),
    'heic',
  );
  assert.equal(
    inferNativeMediaFormat({
      metadataFormat: 'jpeg',
      sniffedType: 'image/heic',
    }),
    'jpg',
  );
  assert.equal(inferNativeMediaFormat({ video: true }), 'mp4');
});

void test('marks Capacitor native apps for the full-bleed shell', () => {
  assert.equal(detectNativeCapacitorApp({ isNativePlatform: true }), true);
  assert.equal(detectNativeCapacitorApp({ isNativePlatform: false }), false);
  assert.equal(
    detectNativeCapacitorApp({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Capacitor/8.5.1',
    }),
    true,
  );
  assert.equal(
    detectNativeCapacitorApp({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    }),
    false,
  );
  const classList = new Set<string>();
  applyNativeCapacitorClass(true, {
    classList: {
      toggle(name: string, force?: boolean) {
        if (force) classList.add(name);
        else classList.delete(name);
      },
    },
  });
  assert.equal(classList.has(NATIVE_CAPACITOR_CLASS), true);
});
