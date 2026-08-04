# -*- coding: utf-8 -*-
"""
把 index.html 中的 PerspMath 内核 + 演示模型 + 透视尺交互逻辑提取出来，在 Node 里实际执行：
  A. perspDebugModel 与 Python 期望值（demo_geometry.py）对账；
  B. 模拟用户拉 3 组透视线 → perspGuideCompute 应恢复出已知灭点与焦距。
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
const window = {};
const state = {
  perspGuide: {
    active: true, visible: true, stage: 'captureLines',
    lines: [], groups: [], vps: [], h: null, circleRpx: 0,
    fov: null, focalPx: 0, focalMm: 0, drag: null, lastParallel: false
  }
};
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

// ---- B: 交互逻辑（模拟 3 组透视线：不吸附，垂心圆）----
const guideState = function() { return state.perspGuide; };
const VPS_LAYER = [[-91.94, 395.80], [233.91, -344.73], [595.84, 336.76]];
const ANCHORS_LAYER = [
  [[201.96, 300.96], [117.80, 245.50]],
  [[246.84, 150.48], [308.55, 217.80]],
  [[381.48, 293.04], [460.02, 245.52]]
];
VPS_LAYER.forEach(function(vp, gi) {
  ANCHORS_LAYER[gi].forEach(function(a) {
    const a2 = [a[0] + 0.35 * (a[0] - vp[0]), a[1] + 0.35 * (a[1] - vp[1])];
    guideState().lines.push({
      a: { x: a[0] / 561, y: a[1] / 396 },
      b: { x: a2[0] / 561, y: a2[1] / 396 }
    });
  });
});
perspGuideCompute();
const g3 = guideState();
console.log('3-group vps', g3.vps.map(function(v){return [v.x.toFixed(4), v.y.toFixed(4)];}).join(' | '));
console.log('3-group f', g3.focalPx.toFixed(3), 'fmm', g3.focalMm.toFixed(3), 'fov', g3.fov ? g3.fov.h.toFixed(3) + '/' + g3.fov.v.toFixed(3) + '/' + g3.fov.d.toFixed(3) : 'null');
let maxVpErr = 0;
g3.vps.forEach(function(v, i) {
  maxVpErr = Math.max(maxVpErr,
    Math.abs(v.x * 561 - VPS_LAYER[i][0]),
    Math.abs(v.y * 396 - VPS_LAYER[i][1]));
});
console.log('3-group maxVpErr(px)', maxVpErr.toExponential(3));
console.log('3-group focalErr(px)', Math.abs(g3.focalPx - 300).toExponential(3));

// ---- C: 两点透视（2 组线）：第二灭点吸附到视平线，f = |V1V2|/2 ----
const g4 = guideState();
g4.lines = g4.lines.slice(0, 4);
g4.vps = []; g4.h = null; g4.circleRpx = 0; g4.fov = null; g4.focalPx = 0; g4.focalMm = 0;
perspGuideCompute();
console.log('2-group vps', g4.vps.map(function(v){return [v.x.toFixed(4), v.y.toFixed(4)];}).join(' | '));
console.log('2-group snapped(y equal)', Math.abs(g4.vps[1].y - g4.vps[0].y) < 1e-12);
const v1 = [g4.vps[0].x * 561, g4.vps[0].y * 396];
const v2 = [g4.vps[1].x * 561, g4.vps[1].y * 396];
const expectF = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]) / 2;
console.log('2-group focal=|V1V2|/2', Math.abs(g4.focalPx - expectF).toExponential(3));
console.log('2-group f', g4.focalPx.toFixed(3), 'fov h/v/d', g4.fov.h.toFixed(2) + '/' + g4.fov.v.toFixed(2) + '/' + g4.fov.d.toFixed(2));
"""


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        t = fh.read()
    i0 = t.index("const PerspMath = {")
    i1 = t.index("function drawPaintStageOverlay()")
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
