# -*- coding: utf-8 -*-
"""扫描 index.html，输出结构目录素材：行数、分区横幅注释、顶层函数锚点。"""

import io
import re
import sys

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    with io.open(PATH, "r", encoding="utf-8") as fh:
        lines = fh.read().split("\n")
    print("total lines:", len(lines))

    banners = []
    for i, ln in enumerate(lines, 1):
        s = ln.strip()
        if re.match(r"^(//\s*[=\-─━]{6,}|/\*\s*[=\-]{6,})", s):
            banners.append((i, s[:100]))
    print("banner comment lines:", len(banners))
    for i, s in banners[:120]:
        print(i, s)

    mode = sys.argv[1] if len(sys.argv) > 1 else "functions"
    if mode == "functions":
        fns = []
        for i, ln in enumerate(lines, 1):
            m = re.match(r"^    (?:async )?function ([A-Za-z_$][\w$]*)\(|\b(?:async )?function ([A-Za-z_$][\w$]*)\(", ln)
            if m:
                fns.append((i, m.group(1) or m.group(2)))
        print("top-level function decls:", len(fns))
        for i, name in fns:
            print(i, name)
    elif mode == "anchors":
        anchors = [
            "<html", "<head", "<style", "</style>", "<body",
            "const I18N =", "const state = {",
            "function createInitialProject", "function normalizeProjectSnapshot",
            "function restoreProject", "function resetProjectForNewProject",
            "function projectForJsonStorage", "function buildConteFolderBundle",
            "function exportConteFolderZip", "function importConteFolderZip",
            "function saveJson",
            "function drawPaintStageOverlay", "function drawGengaPreview",
            "function gengaDrawStart", "function beginPaintStroke", "function beginVideoPaintStroke",
            "const PerspMath =", "// ===== 透视步进尺", "function normalizePerspGuide",
            "function drawPerspGuide", "function perspGuideCompute", "function perspGuideWalk",
            "function renderStageView", "function refresh(", "function updatePaintUI",
            "function setActivePaintTool", "function selectPaintEditTool",
            "function normalizeGengaLayer", "function gengaPreviewPointerXY",
            "data-paint-guide=", "id=\"conteVideoStage\"", "id=\"gengaStage\"",
        ]
        for a in anchors:
            hits = []
            for i, ln in enumerate(lines, 1):
                if a in ln:
                    hits.append(i)
            print(a, "->", hits[:6])
    elif mode == "sample":
        fns = []
        for i, ln in enumerate(lines, 1):
            m = re.match(r"^    (?:async )?function ([A-Za-z_$][\w$]*)\(|\b(?:async )?function ([A-Za-z_$][\w$]*)\(", ln)
            if m:
                fns.append((i, m.group(1) or m.group(2)))
        step = max(1, len(fns) // 120)
        for idx in range(0, len(fns), step):
            i, name = fns[idx]
            print(i, name)
    elif mode == "sections":
        for i, ln in enumerate(lines, 1):
            if "## SECTION" in ln or "# SECTION" in ln:
                print(i, ln.strip()[:120])


if __name__ == "__main__":
    main()
