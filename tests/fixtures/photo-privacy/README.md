# Synthetic image privacy fixtures

Created for the 2026-10-28 audit with Pillow 11.3.0: 8 × 6 generated colour patterns, not user photographs. Each contains a real sRGB ICC profile, EXIF orientation 6, synthetic GPS and synthetic camera identifiers; private sentinel strings use `PRIVATE_`.

- `metadata.jpg`: progressive JPEG with EXIF, XMP, IPTC, ICC and comments, including a comment after the final scan.
- `metadata.png`: PNG with EXIF, ICC and text metadata.
- `metadata.webp`: lossless WebP with EXIF, XMP and ICC.
- `animated.webp`: two-frame animated lossless WebP with EXIF, XMP and ICC.

`tests/photo-privacy.test.ts` checks metadata removal, fail-closed handling, preserved ICC, upload use and no provider calls from the retired endpoint. `python3 tests/verify-photo-fixtures.py` independently decodes original/clean outputs with Pillow and compares every frame, effective EXIF orientation and ICC. It needs Node on PATH and Pillow; it creates only temporary outputs, never contacts services.

These fixtures do not prove all codec combinations or all consumer decoders. The implementation changes image containers only, retains encoded image payloads and orientation, and does not decode/recompress pixels. HEIC/HEIF and video are outside the metadata cleanup guarantee.
