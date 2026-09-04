# -*- coding: utf-8 -*-
"""
新しい参考シート(e55e5336-...png / RGBA)から、キャラクターの各ポーズと
部屋の背景を切り出す。assets/characters/girl01/<state>/frame_N.png という
将来のキャラクター追加を見据えたディレクトリ構造で保存する。

このシートは既にRGBAで、コンテンツの周囲にソフトなグロー/影が
半透明でにじんでいるため、単純な背景色キー抜きではなく
「アルファが十分高い领域だけを実体として扱う」方式でクロップ範囲を
検出している（tools/analyze_sheet2.py 参照）。切り出したフレーム自体は
透過をそのまま活かす（アルファがなだらかなので、軽くしきい値を上げて
縁のにじみを引き締める）。
"""

import os
from PIL import Image
import numpy as np

SOURCE_IMAGE = r"C:\Users\erina\Downloads\e55e5336-b8a7-4bd0-b239-ea3cf05f90af.png"
OUT_CHAR_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "characters", "girl01")
OUT_BG_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds")

# (state, y0, y1, x0, x1, frame_count)  -- x0,x1 はグループ全体の範囲。
# フレーム数ぶん均等分割する（analyze_sheet2.py で実際のギャップも確認済み）。
POSE_GROUPS = [
    ("idle",       37,  174, 645, 1204, 4),
    ("study",      207, 304, 645, 1518, 7),
    ("page-turn",  340, 434, 645, 1452, 5),
    ("drink",      470, 559, 645, 1380, 5),
    ("think",      594, 675, 645, 1436, 6),
    ("stretch",    707, 790, 645, 992,  3),
    ("yawn",       707, 825, 1025, 1466, 4),
    ("laptop",     828, 922, 645, 1075, 4),
]

ROOM_BG_BOX = (9, 6, 622, 390)  # 自室(夜)の1枚絵 x0,y0,x1,y1

ALPHA_TIGHTEN = 40  # このアルファ未満は完全透明に落として縁のにじみを引き締める


def tighten_alpha(img):
    arr = np.array(img.convert("RGBA"))
    a = arr[:, :, 3].astype(float)
    a = np.clip((a - ALPHA_TIGHTEN) / (255 - ALPHA_TIGHTEN), 0, 1) * 255
    arr[:, :, 3] = a.astype(np.uint8)
    return Image.fromarray(arr, mode="RGBA")


def main():
    src = Image.open(SOURCE_IMAGE).convert("RGBA")

    for state, y0, y1, x0, x1, n in POSE_GROUPS:
        out_sub = os.path.join(OUT_CHAR_DIR, state)
        os.makedirs(out_sub, exist_ok=True)
        group_w = x1 - x0
        frame_w = group_w / n
        for i in range(n):
            fx0 = int(round(x0 + i * frame_w))
            fx1 = int(round(x0 + (i + 1) * frame_w))
            crop = src.crop((fx0, y0, fx1, y1))
            crop = tighten_alpha(crop)
            crop.save(os.path.join(out_sub, f"frame_{i+1}.png"))
        print(f"{state}: {n} frames -> {out_sub}")

    os.makedirs(OUT_BG_DIR, exist_ok=True)
    room = src.crop(ROOM_BG_BOX).convert("RGB")
    room_path = os.path.join(OUT_BG_DIR, "room_v2_night.png")
    room.save(room_path)
    print(f"room background -> {room_path} size={room.size}")


if __name__ == "__main__":
    main()
