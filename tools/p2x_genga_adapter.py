# -*- coding: utf-8 -*-
"""
P2.x genga 适配：把透视尺代码块里的硬编码 conte 尺寸/坐标换算替换为动态版本。
只替换 [透视尺起始注释, drawPaintStageOverlay()] 区间，并跳过辅助函数定义区
（perspGuidePaper/perspGuideFrame/perspNormX/perspNormY/perspGuideRedraw）。
幂等：已替换的字符串不会重复替换。
"""

import io
import sys

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"
START = "// ===== 透视步进尺 P0.5 交互"
END = "function drawPaintStageOverlay()"

TOKENS = [
    ("conteNormToLayerX", "perspNormX"),
    ("conteNormToLayerY", "perspNormY"),
    ("CONTE_PAPER_WIDTH", "perspGuidePaper().w"),
    ("CONTE_PAPER_HEIGHT", "perspGuidePaper().h"),
    ("CONTE_FRAME_W", "perspGuideFrame().w"),
    ("CONTE_FRAME_H", "perspGuideFrame().h"),
]


def skip_span(body, fn_name):
    """返回 fn_name 函数体的 [start, end]（含），用于排除不替换的区域。"""
    i = body.index(fn_name)
    b = body.index("{", i)
    depth = 0
    j = b
    while j < len(body):
        if body[j] == "{":
            depth += 1
        elif body[j] == "}":
            depth -= 1
            if depth == 0:
                return (i, j + 1)
        j += 1
    raise RuntimeError("unbalanced: " + fn_name)


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        t = fh.read()
    i0 = t.index(START)
    i1 = t.index(END, i0)
    block = t[i0:i1]

    # 辅助定义区（含 perspGuideRedraw）不替换
    spans = []
    for name in ("function perspGuidePaper", "function perspGuideFrame",
                 "function perspNormX", "function perspNormY",
                 "function perspGuideRedraw"):
        spans.append(skip_span(block, name))
    spans.sort()
    # 合并可能相邻的区间
    merged = []
    for s in spans:
        if merged and s[0] <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], s[1]))
        else:
            merged.append(list(s))

    def in_skip(idx):
        return any(s[0] <= idx < s[1] for s in merged)

    out = []
    pos = 0
    changed = 0
    while pos < len(block):
        if in_skip(pos):
            out.append(block[pos])
            pos += 1
            continue
        hit = None
        for old, new in TOKENS:
            if block.startswith(old, pos):
                hit = (old, new)
                break
        if hit is not None:
            # 幂等：若已是新串（例如 perspNormX 前的 persp），避免误替换
            out.append(hit[1])
            changed += 1
            pos += len(hit[0])
        else:
            out.append(block[pos])
            pos += 1
    # drawPaintStageOverlay() → perspGuideRedraw()（跳过 perspGuideRedraw 定义区）
    new_block = "".join(out)
    tail = new_block
    # 只处理定义区之外的调用：perspGuideRedraw 定义区已原样保留（含 drawPaintStageOverlay()），
    # 其余 drawPaintStageOverlay() 调用替换
    redraw_span = skip_span(new_block, "function perspGuideRedraw")
    before = new_block[:redraw_span[0]]
    core = new_block[redraw_span[0]:redraw_span[1]]
    after = new_block[redraw_span[1]:]
    n_redraw = after.count("drawPaintStageOverlay()")
    after = after.replace("drawPaintStageOverlay()", "perspGuideRedraw()")
    new_block = before + core + after

    t2 = t[:i0] + new_block + t[i1:]
    with io.open(PATH, "w", encoding="utf-8", newline="") as fh:
        fh.write(t2)
    print("tokens replaced:", changed)
    print("redraw calls replaced:", n_redraw)


if __name__ == "__main__":
    main()
