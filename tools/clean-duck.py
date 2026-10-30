# Turns a club duck (transparent or on white) into a card portrait with a soft tint.
# Run: python tools/clean-duck.py <source image> <duck id> [tint hex]
import sys
from PIL import Image, ImageDraw, ImageFilter

src, name = sys.argv[1], sys.argv[2]
tint = sys.argv[3] if len(sys.argv) > 3 else '#d9c9a3'

rgba = Image.open(src).convert('RGBA')
alpha = rgba.getchannel('A')
if alpha.getextrema()[0] == 255:
    # no transparency in the file: key the white background out from the corners
    w, h = rgba.size
    px = rgba.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if min(r, g, b) > 232:
                mp[x, y] = 255
    for seed in [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]:
        if mp[seed] == 255:
            ImageDraw.floodfill(mask, seed, 128)
    alpha = mask.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(alpha)

# frame the duck from the top of its head, the way the card window shows it
duck = rgba.crop(alpha.point(lambda v: 255 if v > 20 else 0).getbbox())
out_w = 420
out_h = round(out_w * 1.08)
scale = out_w * 0.92 / duck.width
duck = duck.resize((round(duck.width * scale), round(duck.height * scale)), Image.LANCZOS)
card = Image.new('RGBA', (out_w, out_h), tint)
card.alpha_composite(duck, ((out_w - duck.width) // 2, round(out_h * 0.03)))
card.convert('RGB').save(f'assets/ducks/{name}.webp', 'WEBP', quality=86, method=6)
print(name, card.size)
