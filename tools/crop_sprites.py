# -*- coding: utf-8 -*-
"""
ユーザーが渡してくれたリファレンス・スプライトシート(1枚絵)から、
各ポーズを個別のPNG(背景透過)に切り出すスクリプト。

使い方:
    python tools/crop_sprites.py

前提:
- リファレンス画像は SOURCE_IMAGE のパスに配置されている
- シート全体はほぼ均一なクリーム色の背景 (~#fcf5f0) の上に
  ラベル付きのグループが並んでいて、各グループの中に複数ポーズが
  等間隔で並んでいる、という構造を仮定している
- 個々のポーズの境界はグループ幅をポーズ数で均等分割して近似している
  (ポーズ同士が机などで視覚的に繋がっている箇所があり、厳密な自動検出が
  難しいため)。境界がおかしい場合は GROUPS のパディングを調整する。
"""

import os
from PIL import Image
import numpy as np

SOURCE_IMAGE = r"C:\Users\erina\Downloads\a876473b-3f25-4c17-9a3f-0453e534c07e.png"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites")

# (state_name, x0, x1, y0, y1, frame_count)
GROUPS = [
    ("idle",   13,  533,  55, 206, 4),   # 基本（待機・まばたき）
    ("study",  556, 1056, 55, 206, 4),   # 書く（勉強）
    ("page_turn", 1078, 1437, 55, 206, 4),  # ページをめくる
    ("think",  1455, 1657, 55, 206, 2),  # 考える

    ("pc",     12,  398,  253, 393, 3),  # PCを使う
    ("drink",  440, 866,  253, 393, 4),  # 飲み物を飲む
    ("stretch",903, 1298, 253, 393, 3),  # 伸びをする
    ("yawn",   1342,1657, 253, 393, 3),  # あくび・眠い

    ("watch_clock", 21, 372, 433, 566, 3),  # 時計を見る
    ("phone",  406, 815,  433, 566, 4),  # スマホを見る（休憩中）
    ("focus",  856, 1226, 433, 566, 3),  # うつむく／集中
    ("happy",  1262,1617, 433, 566, 3),  # 嬉しい／やった！
]

BG_SAMPLE_MARGIN = 3       # 端からこの幅の帯で背景色を推定
ALPHA_LOW, ALPHA_HIGH = 10, 34  # この距離の間でソフトに透過させる


def estimate_bg_color(crop_arr):
    h, w, _ = crop_arr.shape
    m = BG_SAMPLE_MARGIN
    edge_pixels = np.concatenate([
        crop_arr[0:m, :, :].reshape(-1, 3),
        crop_arr[-m:, :, :].reshape(-1, 3),
        crop_arr[:, 0:m, :].reshape(-1, 3),
        crop_arr[:, -m:, :].reshape(-1, 3),
    ])
    return np.median(edge_pixels, axis=0)


def chroma_key(crop_img):
    arr = np.array(crop_img.convert("RGB")).astype(float)
    bg = estimate_bg_color(arr)
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    alpha = np.clip((dist - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW), 0, 1)
    alpha = (alpha * 255).astype(np.uint8)
    rgba = np.dstack([arr.astype(np.uint8), alpha])
    return Image.fromarray(rgba, mode="RGBA")


def main():
    src = Image.open(SOURCE_IMAGE).convert("RGB")
    for name, x0, x1, y0, y1, n in GROUPS:
        out_sub = os.path.join(OUT_DIR, name)
        os.makedirs(out_sub, exist_ok=True)
        group_w = x1 - x0
        frame_w = group_w / n
        for i in range(n):
            fx0 = int(round(x0 + i * frame_w))
            fx1 = int(round(x0 + (i + 1) * frame_w))
            crop = src.crop((fx0, y0, fx1, y1))
            keyed = chroma_key(crop)
            out_path = os.path.join(out_sub, f"frame_{i+1}.png")
            keyed.save(out_path)
        print(f"{name}: {n} frames -> {out_sub}")


if __name__ == "__main__":
    main()
