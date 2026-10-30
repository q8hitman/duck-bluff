# Upscales the club ducks from the team sheet and removes the lab background.
# Run with the art-tools venv: python tools/upscale-club.py
import subprocess
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

TOOLS = Path(r'C:\Users\User\Desktop\AI-Tools\art-tools')
ESRGAN = TOOLS / 'esrgan' / 'realesrgan-ncnn-vulkan.exe'
OUT = Path('assets/ref/upscaled')
OUT.mkdir(parents=True, exist_ok=True)

BOXES = {
    'camel': (118, 288, 310, 546), 'abdullah': (350, 304, 548, 550), 'ahmad': (558, 318, 750, 548),
    'rawan': (834, 318, 1012, 548), 'shouq': (1072, 320, 1268, 548), 'loujain': (1312, 308, 1496, 548),
    'fayzah': (130, 600, 316, 804), 'bassam': (380, 602, 568, 802), 'ali': (658, 602, 842, 802),
    'ruaa': (950, 618, 1122, 808), 'motivator': (1214, 598, 1408, 804),
}

sheet = Image.open('assets/ref/bsc_reference.png').convert('RGB')
session = new_session('isnet-anime')
for name, box in BOXES.items():
    raw = OUT / f'{name}-raw.png'
    big = OUT / f'{name}-big.png'
    sheet.crop(box).save(raw)
    subprocess.run([str(ESRGAN), '-i', str(raw.resolve()), '-o', str(big.resolve()), '-n', 'realesrgan-x4plus-anime', '-s', '4'],
                   check=True, cwd=ESRGAN.parent, capture_output=True)
    cut = remove(Image.open(big).convert('RGB'), session=session, post_process_mask=True)
    cut.save(OUT / f'{name}.png')
    raw.unlink()
    big.unlink()
    print(name, cut.size)
