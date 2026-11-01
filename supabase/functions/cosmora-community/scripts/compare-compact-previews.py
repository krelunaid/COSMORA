import json, os
from PIL import Image, ImageOps, ImageDraw

root = 'outputs/community-photo-optimization/current'
entries = json.load(open(os.path.join(root, 'manifest-private.json')))
out = os.path.join(root, 'compact')
os.makedirs(out, mode=0o700, exist_ok=True)
os.chmod(out, 0o700)
variants = [('jpeg68', 'JPEG', 68), ('jpeg55', 'JPEG', 55), ('webp68', 'WEBP', 68)]
totals = {name: 0 for name, _, _ in variants}
panels = []
for index, entry in enumerate(entries):
    stem = entry['thumbnail_file'][:-4]
    with Image.open(os.path.join(root, stem + '.original')) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        row = []
        for name, fmt, quality in variants:
            path = os.path.join(out, f'{stem}.{name}.{"webp" if fmt == "WEBP" else "jpg"}')
            image.save(path, format=fmt, quality=quality, optimize=True, **({'progressive': True} if fmt == 'JPEG' else {'method': 6}))
            os.chmod(path, 0o600)
            size = os.path.getsize(path)
            totals[name] += size
            with Image.open(path) as check:
                if check.getexif():
                    raise ValueError('Metadata not stripped')
                check.load()
                row.append((check.copy(), size))
        panels.append(row)

sheet = Image.new('RGB', (960, len(panels) * 250), '#fff')
draw = ImageDraw.Draw(sheet)
for i, row in enumerate(panels):
    for j, (image, size) in enumerate(row):
        image.thumbnail((310, 220), Image.Resampling.LANCZOS)
        x, y = j * 320, i * 250
        sheet.paste(image, (x + (320 - image.width) // 2, y))
        draw.text((x + 8, y + 225), f'Foto {i + 1} | {variants[j][0]} | {size // 1024} KB', fill='black')
sheet.save(os.path.join(out, 'confronto.jpg'), quality=90)
os.chmod(os.path.join(out, 'confronto.jpg'), 0o600)
print(json.dumps({'images': len(entries), 'totals': totals}))
