# -*- coding: utf-8 -*-
"""
把 index.html 中的 PerspMath 内核 + 演示模型提取出来，在 Node 里实际执行，
与 Python 期望值（persp-math-test/demo_geometry.py）对账。
"""

import io
import os
import re
import subprocess
import sys
import tempfile

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"
NODE = r"C:\Users\Lanla\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

STUBS = """
const conteNormToLayerX = function(n) { return n * 561; };
const conteNormToLayerY = function(n) { return n * 396; };
const CONTE_PAPER_WIDTH = 561;
const CONTE_PAPER_HEIGHT = 396;
"""

MAIN = """
const m = perspDebugModel();
console.log('H', m.H[0].toFixed(4), m.H[1].toFixed(4));
console.log('f', m.f.toFixed(4), 'r', m.r.toFixed(4), 'fmm', m.fmm.toFixed(4));
console.log('fov', m.fov.h.toFixed(4), m.fov.v.toFixed(4), m.fov.d.toFixed(4));
let maxErr = 0;
m.p.forEach(function(pt) {
  const d = Math.hypot(pt[0] - m.H[0], pt[1] - m.H[1]);
  maxErr = Math.max(maxErr, Math.abs(d - m.r));
});
console.log('P max |dist-r|', maxErr.toExponential(3));
console.log('vps', m.vps.map(function(v){return [v[0].toFixed(2), v[1].toFixed(2)];}).join(' | '));
"""


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        t = fh.read()
    i0 = t.index("const PerspMath = {")
    i1 = t.index("// 控制台开关")
    block = t[i0:i1]
    src = STUBS + "\n" + block + MAIN
    fd, tmp = tempfile.mkstemp(suffix=".js")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(src)
    r = subprocess.run([NODE, tmp], capture_output=True, text=True)
    os.unlink(tmp)
    if r.returncode != 0:
        print(r.stderr[:3000])
        sys.exit(1)
    print(r.stdout)


if __name__ == "__main__":
    main()
