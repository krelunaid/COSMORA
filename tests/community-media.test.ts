import assert from 'node:assert/strict';
import test from 'node:test';

import {
  communityMediaSelectionError,
  inferCommunityMediaType,
  isAllowedCommunityMediaFile,
  isHeicLike,
  sniffCommunityMediaType,
} from '../lib/community-media.ts';

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
