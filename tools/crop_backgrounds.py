# -*- coding: utf-8 -*-
"""
参考スプライトシート下部の「場所の背景（例）」8枚を切り出す。
背景写真なので透過処理はせず、そのままクロップして保存する。
"""

import os
from PIL import Image

SOURCE_IMAGE = r"C:\Users\erina\Downloads\a876473b-3f25-4c17-9a3f-0453e534c07e.png"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds")

# (name, x0, x1, y0, y1)
BACKGROUNDS = [
    ("room_day",    515, 683,  712, 804),   # 自室（昼）
    ("cafe",        692, 858,  712, 804),   # カフェ
    ("library",     860, 1034, 712, 804),   # 図書館
    ("room_night",  1036, 1207, 712, 804),  # 夜の自室
    ("seaside",     515, 683,  827, 911),   # 海辺
    ("forest",      692, 854,  827, 911),   # 森の中
    ("campsite",    862, 1033, 827, 911),   # キャンプ場
    ("room_dusk",   1042, 1207, 827, 911),  # 夕暮れの窓辺
]


def main():
    src = Image.open(SOURCE_IMAGE).convert("RGB")
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, x0, x1, y0, y1 in BACKGROUNDS:
        crop = src.crop((x0, y0, x1, y1))
        out_path = os.path.join(OUT_DIR, f"{name}.png")
        crop.save(out_path)
        print(f"{name}: {crop.size} -> {out_path}")


if __name__ == "__main__":
    main()
