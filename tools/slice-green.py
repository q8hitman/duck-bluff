# Cuts the club ducks out of the green-screen sheet: crop, upscale, key out the green.
# Run with the art-tools venv: python tools/slice-green.py
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ESRGAN = Path(r'C:\Users\User\Desktop\AI-Tools\art-tools\esrgan\realesrgan-ncnn-vulkan.exe')
OUT = Path('assets/ref/green')
OUT.mkdir(parents=True, exist_ok=True)

BOXES = {
    'camel': (340, 15, 612, 345), 'abdullah': (655, 15, 925, 345), 'ahmad': (955, 15, 1212, 345),
    'rawan': (1255, 15, 1505, 345), 'shouq': (45, 350, 315, 672), 'loujain': (365, 350, 622, 672),
    'fayzah': (662, 350, 890, 672), 'bassam': (950, 350, 1192, 672), 'ali': (1245, 350, 1510, 672),
    'ruaa': (25, 675, 325, 985), 'motivator': (350, 675, 612, 985), 'dawoud': (628, 675, 900, 985),
    'hora': (920, 675, 1192, 985),
}

sheet = Image.open('assets/ref/team-green.png').convert('RGB')
for name, box in BOXES.items():
    raw = OUT / f'{name}-raw.png'
    big = OUT / f'{name}-big.png'
    sheet.crop(box).save(raw)
    subprocess.run([str(ESRGAN), '-i', str(raw.resolve()), '-o', str(big.resolve()), '-n', 'realesrgan-x4plus-anime', '-s', '4'],
                   check=True, cwd=ESRGAN.parent, capture_output=True)
    px = np.array(Image.open(big).convert('RGB')).astype(float)
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    green = (g - np.maximum(r, b)) / 255

    # solid = clearly not screen; soften the edge and remove green spill from it
    alpha = np.clip(1 - (green - 0.12) / 0.22, 0, 1)
    solid = alpha > 0.5
    labels, count = ndi.label(solid, structure=np.ones((3, 3), bool))
    if count:
        sizes = ndi.sum(solid, labels, range(1, count + 1))
        # keep the duck and anything sizeable beside it, drop specks from neighbours
        big_parts = [i + 1 for i, s in enumerate(sizes) if s >= 30]
        keep = np.isin(labels, big_parts)
        alpha = np.where(ndi.binary_dilation(keep, iterations=2), alpha, 0)
    spill = green > 0
    px[..., 1] = np.where(spill, np.maximum(r, b), g)

    out = np.dstack([px, alpha * 255]).astype('uint8')
    Image.fromarray(out, 'RGBA').save(OUT / f'{name}.png')
    raw.unlink()
    big.unlink()
    print(name, out.shape[1], out.shape[0])
