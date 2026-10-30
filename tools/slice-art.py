# Cuts the ChatGPT sheets in assets/ref into game assets. Run: python tools/slice-art.py
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

REF = Path('assets/ref')
GUESTS = Path('assets/guests')
IMPOSTORS = Path('assets/impostors')
UI = Path('assets/ui')
for d in (GUESTS, IMPOSTORS, UI):
    d.mkdir(parents=True, exist_ok=True)


def save(im, path, width, quality=82):
    h = round(im.height * width / im.width)
    im.resize((width, h), Image.LANCZOS).save(path, 'WEBP', quality=quality, method=6)


# guests: 6 columns, rows of uneven height
sheet = Image.open(REF / 'gpt-4.webp').convert('RGB')
cols = [(0, 183), (188, 370), (373, 555), (560, 745), (752, 930), (936, 1122)]
rows = [(0, 253), (258, 500), (505, 718), (723, 938), (943, 1148), (1153, 1402)]
names = [
    ['lab', 'guard', 'echo', 'queue', 'witness', 'corners'],
    ['skeptic', 'squad', 'news', 'chatter', 'twinA', 'twinB'],
    ['shy', 'confident', 'halves', 'rumors', 'numbers', 'fazaa'],
    ['edge', 'sensitive', 'visitor', 'cafeteria', 'sleepy', 'photographer'],
    ['newbie', 'attendance', 'late', 'snap', 'homework', 'breakTime'],
    ['plants', 'lost', 'graduate', 'wifi', 'microwave', 'organizer'],
]
for r, row in enumerate(names):
    for c, name in enumerate(row):
        x0, x1 = cols[c]
        y0, y1 = rows[r]
        save(sheet.crop((x0, y0, x1, y1)), GUESTS / f'{name}.webp', 320)

# impostors
sheet = Image.open(REF / 'gpt-6.webp').convert('RGB')
boxes = {
    'impostor': (0, 0, 352, 705), 'saboteur': (358, 0, 760, 705), 'mimic': (765, 0, 1122, 705),
    'concealer': (0, 712, 558, 1402), 'shadow': (565, 712, 1122, 1402),
}
for name, box in boxes.items():
    save(sheet.crop(box), IMPOSTORS / f'{name}.webp', 360)

# frames: the "transparent" background is a painted checkerboard, so key it out
sheet = Image.open(REF / 'gpt-7.webp').convert('RGB')


def frame(box, out):
    im = sheet.crop(box)
    w, h = im.size
    px = im.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if max(r, g, b) - min(r, g, b) < 16 and min(r, g, b) > 185:
                mp[x, y] = 255
    # flood from the corners and the window so white details in the art survive
    seeds = [(1, 1), (w // 2, 1), (w // 4, 1), (3 * w // 4, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2), (w // 2, h // 2 - 40)]
    for seed in seeds:
        if mp[seed] == 255:
            ImageDraw.floodfill(mask, seed, 128)
    alpha = mask.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)
    save(rgba, UI / f'{out}.webp', 420, 88)


frame((52, 2, 526, 686), 'frame-club')
frame((530, 22, 1006, 676), 'frame-guest')
frame((1012, 2, 1492, 686), 'frame-impostor')

back = sheet.crop((522, 686, 1016, 996))
save(back, UI / 'card-back.webp', 620, 85)
icon = back.crop((130, 15, 364, 249))
icon.resize((512, 512), Image.LANCZOS).save(UI / 'icon-512.png')
icon.resize((192, 192), Image.LANCZOS).save(UI / 'icon-192.png')

save(Image.open(REF / 'gpt-5.webp').convert('RGB'), UI / 'table.webp', 1500, 74)
