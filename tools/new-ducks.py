# Cuts the two newest club ducks from their dark sheets onto a card background.
# Run with the audio-tools venv: python tools/new-ducks.py
import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

SIZE = (420, 454)
DUCKS = {'muaili': (205, 215, 232), 'kiraz': (240, 212, 214)}
BOX = (670, 0, 1536, 1024)  # the large pose on each sheet
session = new_session('isnet-anime')

for name, color in DUCKS.items():
    sheet = Image.open(f'assets/ref/new-ducks/{name}-sheet.webp').convert('RGB').crop(BOX)
    cut = remove(sheet, session=session, alpha_matting=False)
    alpha = np.array(cut.getchannel('A'))
    # A hard edge, drawn just inside the line art, leaves no trace of the dark glow.
    mask = Image.fromarray(((alpha > 128) * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    cut.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 40 else 0).getbbox()
    figure = cut.crop(box)
    scale = min((SIZE[0] - 20) / figure.width, (SIZE[1] - 12) / figure.height)
    figure = figure.resize((round(figure.width * scale), round(figure.height * scale)), Image.LANCZOS)
    card = Image.new('RGB', SIZE, color)
    card.paste(figure, ((SIZE[0] - figure.width) // 2, SIZE[1] - figure.height - 4), figure)
    card.save(f'assets/ducks/{name}.webp', quality=88)
    print(name, 'figure', figure.size, 'kept', round((alpha > 128).mean() * 100), '%')
