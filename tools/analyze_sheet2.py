import sys
from PIL import Image
import numpy as np

SRC = r"C:\Users\erina\Downloads\e55e5336-b8a7-4bd0-b239-ea3cf05f90af.png"
im = Image.open(SRC)
arr = np.array(im)
alpha = arr[:, :, 3].astype(float)
h, w = alpha.shape


def bands(mask_1d, min_frac):
    high = mask_1d > min_frac
    runs = []
    start = None
    for i, v in enumerate(high):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(high) - 1))
    return runs


def row_bands(x0, x1, y0=0, y1=None, alpha_thresh=25, frac=0.02):
    y1 = h - 1 if y1 is None else y1
    sub = alpha[y0:y1 + 1, x0:x1 + 1]
    m = (sub > alpha_thresh).mean(axis=1)
    return [(a + y0, b + y0) for a, b in bands(m, frac)]


def col_bands(y0, y1, x0=0, x1=None, alpha_thresh=25, frac=0.02):
    x1 = w - 1 if x1 is None else x1
    sub = alpha[y0:y1 + 1, x0:x1 + 1]
    m = (sub > alpha_thresh).mean(axis=0)
    return [(a + x0, b + x0) for a, b in bands(m, frac)]


if __name__ == "__main__":
    print("full-width row bands:")
    for b in row_bands(0, w - 1):
        print(b, b[1] - b[0] + 1)
