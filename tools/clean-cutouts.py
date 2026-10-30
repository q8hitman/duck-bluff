# Removes leftover background from the upscaled ducks. The ink outline acts as a wall:
# anything light that reaches the edge without crossing it is background.
# Run with the art-tools venv: python tools/clean-cutouts.py
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = Path('assets/ref/upscaled')
EIGHT = np.ones((3, 3), bool)

# The top row stood in front of the lab: strip thin lab lines stuck to the duck,
# then bring back the thin things each duck holds (boxes are fractions x0, y0, x1, y1).
STRICT = {'camel', 'abdullah', 'ahmad', 'rawan', 'shouq'}
ERASE = {
    'camel': [(0, 0, .255, .30), (.37, 0, .5, .06)],
    'abdullah': [(0, 0, .25, .16), (0, .16, .1, .24), (0, .30, .12, .42), (.7, .15, 1, .24)],
    'ahmad': [(0, .27, .2, .42), (.66, .27, 1, .33)],
    'rawan': [(0, .30, .1, .40), (.66, .1, 1, .2), (.92, .28, 1, .38), (.75, .28, .82, .33)],
    'shouq': [(.5, 0, .85, .14)],
}
RESTORE = {
    'rawan': [(0, .82, .5, 1)],
    'camel': [(0, .40, .24, .58)],
    'abdullah': [(.75, .18, 1, .46)],
    'ahmad': [(.78, .31, 1, .62)],
}

for path in sorted(OUT.glob('*.png')):
    if path.stem.endswith('-clean'):
        continue
    im = Image.open(path).convert('RGBA')
    px = np.array(im)
    alpha = px[..., 3] > 40
    lum = px[..., :3].mean(axis=2)
    ink = ndi.binary_dilation(lum < 75, iterations=1)

    # flood from the transparent area and the image border through non-ink pixels
    free = ~ink
    labels, _ = ndi.label(free)
    edge = ~alpha
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    outside = np.isin(labels, np.unique(labels[edge & free]))
    solid = alpha & ~outside

    # the duck is the biggest piece; keep what stays attached to it
    strict = path.stem in STRICT
    core = ndi.binary_opening(solid, iterations=8 if strict else 3)
    labels, count = ndi.label(core, structure=EIGHT)
    if count:
        sizes = ndi.sum(core, labels, range(1, count + 1))
        core = labels == (1 + int(np.argmax(sizes)))
    keep = ndi.binary_dilation(core, iterations=12 if strict else 6, mask=solid)
    keep = ndi.binary_fill_holes(keep)

    a = Image.fromarray((keep * 255).astype('uint8')).resize(im.size)
    original = px[..., 3].copy()
    px[..., 3] = np.minimum(original, np.array(a))
    h, w = keep.shape
    box = lambda f: (int(f[1] * h), int(f[3] * h), int(f[0] * w), int(f[2] * w))
    for f in RESTORE.get(path.stem, []):
        y0, y1, x0, x1 = box(f)
        px[y0:y1, x0:x1, 3] = original[y0:y1, x0:x1]
    for f in ERASE.get(path.stem, []):
        y0, y1, x0, x1 = box(f)
        px[y0:y1, x0:x1, 3] = 0
    if strict:
        # lab scraps are dull greys and browns; flood them in from outside, but stop
        # at the duck's light feathers, bright colors and thick dark shapes
        rgb = px[..., :3].astype(float)
        hi, lo = rgb.max(axis=2), rgb.min(axis=2)
        sat = (hi - lo) / np.maximum(hi, 1)
        shown = px[..., 3] > 40
        dull = (rgb.mean(axis=2) < 172) & (sat < 0.72)
        dull[int(h * 0.56):, :] = False
        dark_shape = ndi.binary_opening(rgb.mean(axis=2) < 52, iterations=4)
        path_through = dull & ~dark_shape
        labels, _ = ndi.label(path_through | ~shown)
        scrap = (labels == labels[0, 0]) & shown
        body = shown & ~scrap
        body = ndi.binary_opening(body, iterations=2)
        labels, count = ndi.label(body, structure=EIGHT)
        if count:
            sizes = ndi.sum(body, labels, range(1, count + 1))
            body = labels == (1 + int(np.argmax(sizes)))
        keep2 = ndi.binary_dilation(body, iterations=7, mask=shown)
        keep2 = ndi.binary_fill_holes(keep2)
        px[..., 3] = np.where(keep2, px[..., 3], 0)
        for f in RESTORE.get(path.stem, []):
            y0, y1, x0, x1 = box(f)
            px[y0:y1, x0:x1, 3] = np.where(y0 >= int(h * 0.3), original[y0:y1, x0:x1], px[y0:y1, x0:x1, 3])
    clean = Image.fromarray(px, 'RGBA')
    clean.save(OUT / f'{path.stem}-clean.png')
    print(path.stem, int(keep.sum()))
