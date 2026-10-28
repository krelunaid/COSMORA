"""Optional independent decoder check. Requires Node >=22.13 and Pillow.

All input images are tiny synthetic fixtures. No network or real user files.
Run from the repository root: python3 tests/verify-photo-fixtures.py
"""
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "tests/fixtures/photo-privacy"
FORMATS = {
    "metadata.jpg": "image/jpeg",
    "metadata.png": "image/png",
    "metadata.webp": "image/webp",
    "animated.webp": "image/webp",
}

with tempfile.TemporaryDirectory(prefix="cosmora-photo-check-") as temp:
    subprocess.run([
        "node", "--experimental-strip-types", "--input-type=module", "-e",
        "import {readFileSync,writeFileSync} from 'node:fs';"
        "import {sanitizePhotoBytes} from './lib/photo-privacy.ts';"
        "const types={'metadata.jpg':'image/jpeg','metadata.png':'image/png',"
        "'metadata.webp':'image/webp','animated.webp':'image/webp'};"
        "for(const [name,type] of Object.entries(types)) {"
        "const data=readFileSync('tests/fixtures/photo-privacy/'+name);"
        "writeFileSync(process.argv[1]+'/'+name,sanitizePhotoBytes(data,type));}",
        temp,
    ], cwd=ROOT, check=True)
    for name in FORMATS:
        with Image.open(FIXTURES / name) as original, Image.open(Path(temp) / name) as clean:
            frames = getattr(original, "n_frames", 1)
            assert frames == getattr(clean, "n_frames", 1), name
            assert original.info["icc_profile"] == clean.info["icc_profile"], name
            assert dict(clean.getexif()) == {274: 6}, (name, dict(clean.getexif()))
            for frame in range(frames):
                original.seek(frame)
                clean.seek(frame)
                assert original.convert("RGBA").tobytes() == clean.convert("RGBA").tobytes(), name
                assert ImageOps.exif_transpose(original).convert("RGBA").tobytes() == ImageOps.exif_transpose(clean).convert("RGBA").tobytes(), name
            print(f"{name}: same pixels, effective orientation, ICC, {frames} frame(s); EXIF orientation only")
