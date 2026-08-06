# -*- coding: utf-8 -*-
"""定位 index.html 中某个函数声明的结束大括号位置。"""

import io
import re
import sys

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"
FN = "function drawGengaPreview"


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        t = fh.read()
    occ = [m.start() for m in re.finditer(re.escape(FN) + r"\(", t)]
    print("occurrences:", occ)
    if not occ:
        print("not found")
        return
    i = occ[-1]  # 最后一个通常是真正的声明（前面多为注释/调用提及）
    print("fn decl at:", i, "->", t[i:i + 60].replace("\n", " "))
    brace = t.index("{", i)
    depth = 0
    j = brace
    while j < len(t):
        ch = t[j]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                print("fn start:", i)
                print("closing brace at:", j)
                print("tail:", t[j - 200:j + 20].replace("\n", " "))
                return
        j += 1
    print("no match")


if __name__ == "__main__":
    main()
