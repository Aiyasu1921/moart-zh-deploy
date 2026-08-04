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
const CONTE_FRAME_W = 480;
const CONTE_FRAME_H = 270;
const window = {};
const state = {
  perspGuide: {
    active: true, visible: true, stage: 'captureLines',
    lines: [], groups: [], vps: [], h: null, circleRpx: 0,
    fov: null, focalPx: 0, focalMm: 0, drag: null, lastParallel: false,
    character: { box: null, heightCm: 160, shoulderCm: 0, uCm: 0 },
    walk: { stepCm: 60, stepCount: 5, toward: true, steps: [] }
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

// ---- C: 两点透视（2 组线）：不吸附（视平线=V1V2 连线），f = |V1V2|/2，FOV 以摄像机框 480x270 为准 ----
const g4 = guideState();
g4.lines = g4.lines.slice(0, 4);
g4.vps = []; g4.h = null; g4.circleRpx = 0; g4.fov = null; g4.focalPx = 0; g4.focalMm = 0;
perspGuideCompute();
console.log('2-group vps', g4.vps.map(function(v){return [v.x.toFixed(4), v.y.toFixed(4)];}).join(' | '));
const v1 = [g4.vps[0].x * 561, g4.vps[0].y * 396];
const v2 = [g4.vps[1].x * 561, g4.vps[1].y * 396];
const expectF = Math.hypot(v2[0] - v1[0], v2[1] - v1[1]) / 2;
console.log('2-group focal=|V1V2|/2', Math.abs(g4.focalPx - expectF).toExponential(3));
console.log('2-group fov h/v/d (frame-based)', g4.fov.h.toFixed(2) + '/' + g4.fov.v.toFixed(2) + '/' + g4.fov.d.toFixed(2));
console.log('2-group fov_h match 2*atan(240/f)', Math.abs(g4.fov.h - 2 * Math.atan(240 / g4.focalPx) * 180 / Math.PI).toExponential(3));

// ---- D: 三点透视钝角三角形 → 垂心圆无实解，应回退到 V1V2 直径圆 ----
const g5 = guideState();
g5.lines = [];
g5.vps = []; g5.h = null; g5.circleRpx = 0; g5.fov = null; g5.focalPx = 0; g5.focalMm = 0;
// 钝角三角形成员（layer）：V1 左、V2 右、V3 上（垂心在三角形外）
const OBTUSE = [[-168.3, 237.6], [701.25, 217.8], [291.72, -79.2]];
const OBTUSE_ANCHORS = [
  [[112.2, 217.8], [168.3, 178.2]],
  [[392.7, 237.6], [476.85, 198.0]],
  [[224.4, 138.6], [336.6, 118.8]]
];
OBTUSE.forEach(function(vp, gi) {
  OBTUSE_ANCHORS[gi].forEach(function(a) {
    const a2 = [a[0] + 0.35 * (a[0] - vp[0]), a[1] + 0.35 * (a[1] - vp[1])];
    g5.lines.push({
      a: { x: a[0] / 561, y: a[1] / 396 },
      b: { x: a2[0] / 561, y: a2[1] / 396 }
    });
  });
});
perspGuideCompute();
console.log('obtuse-3group vps', g5.vps.map(function(v){return [v.x.toFixed(4), v.y.toFixed(4)];}).join(' | '));
console.log('obtuse-3group circleRpx>0 (fallback)', g5.circleRpx > 0);
const hx = g5.h.x * 561, hy = g5.h.y * 396;
const vv1 = [g5.vps[0].x * 561, g5.vps[0].y * 396];
const vv2 = [g5.vps[1].x * 561, g5.vps[1].y * 396];
console.log('obtuse-3group H=mid(V1,V2)', Math.abs(hx - (vv1[0] + vv2[0]) / 2) < 1e-6 && Math.abs(hy - (vv1[1] + vv2[1]) / 2) < 1e-6);

// ---- E: P1 角色校准：u = 身高/tan(像高占比×垂直FOV)，肩宽=身高×宽高比 ----
const g6 = guideState();
g6.lines = g6.lines.slice(0, 4);
g6.vps = []; g6.h = null; g6.circleRpx = 0; g6.fov = null; g6.focalPx = 0; g6.focalMm = 0;
perspGuideCompute();
g6.character = { box: { x: 0.30, y: 0.35, w: 0.12, h: 0.30 }, heightCm: 160, shoulderCm: 0, uCm: 0 };
perspGuideCalibrate();
const expectShoulder = 160 * (0.12 / 0.30);
const ratioPx = (0.30 * 396) / 270;
const expectU = 160 / Math.tan(ratioPx * (g6.fov.v * Math.PI / 180));
console.log('calib shoulderCm', g6.character.shoulderCm.toFixed(3), 'expect', expectShoulder.toFixed(3));
console.log('calib uCm', g6.character.uCm.toFixed(3), 'expect', expectU.toFixed(3));
console.log('calib match', Math.abs(g6.character.shoulderCm - expectShoulder) < 1e-9 && Math.abs(g6.character.uCm - expectU) < 1e-6);

// ---- F: P1.5 纵深步进：尺寸与原型 atan 公式 1:1；脚底沿 H 射线（共线）----
const g7 = guideState();
g7.lines = g7.lines.slice(0, 4);
g7.vps = []; g7.h = null; g7.circleRpx = 0; g7.fov = null; g7.focalPx = 0; g7.focalMm = 0;
perspGuideCompute();
g7.character = { box: { x: 0.30, y: 0.35, w: 0.12, h: 0.30 }, heightCm: 160, shoulderCm: 64, uCm: 589.867 };
g7.walk = { stepCm: 60, stepCount: 5, toward: true, steps: [] };
perspGuideWalk();
const u0 = g7.character.uCm;
const fovV = g7.fov.v * Math.PI / 180;
let maxH = 0;
g7.walk.steps.forEach(function(s) {
  const u = u0 - s.idx * 60;
  const hPx = (270 / fovV) * Math.atan(160 / u);
  maxH = Math.max(maxH, Math.abs(s.h * 396 - hPx));
});
console.log('walk steps', g7.walk.steps.length, 'max hErr(px)', maxH.toExponential(3));
console.log('walk toward sizes grow', g7.walk.steps.length >= 2 && g7.walk.steps[0].h < g7.walk.steps[g7.walk.steps.length - 1].h);
const H = g7.h;
const f0 = { x: g7.character.box.x + g7.character.box.w / 2, y: g7.character.box.y + g7.character.box.h };
// 默认方向 = 画布垂直：脚底 x 固定，y 相对 H.y 按 u0/u 缩放
let vertErr = 0;
g7.walk.steps.forEach(function(s) {
  const f = { x: s.x + s.w / 2, y: s.y + s.h };
  const u = u0 - s.idx * 60;
  vertErr = Math.max(vertErr, Math.abs(f.x - f0.x));
  vertErr = Math.max(vertErr, Math.abs(f.y - (H.y + (f0.y - H.y) * (u0 / u))));
});
console.log('walk vertical default maxErr', vertErr.toExponential(3));

// ---- G: P2.1 方向线（虚拟相机地面平面）：每步世界距离 = k×步长；矩形等比例 ----
g7.walk.path = { a: { x: f0.x, y: f0.y }, b: { x: f0.x + 0.3, y: f0.y - 0.25 } };
g7.walk.stepCount = 4;
perspGuideWalk();
let ratioErr = 0;
g7.walk.steps.forEach(function(s) {
  ratioErr = Math.max(ratioErr, Math.abs((s.w * 561) / (s.h * 396) - 64 / 160));
});
console.log('walk ratio const err', ratioErr.toExponential(3));
// 世界步长：反投影每步脚底 → 世界坐标，验证距起点 = k×60cm 且沿方向线方向
const f = g7.focalPx;
const Hpx = { x: g7.h.x * 561, y: g7.h.y * 396 };
const F0px = { x: (g7.character.box.x + g7.character.box.w / 2) * 561, y: (g7.character.box.y + g7.character.box.h) * 396 };
const hCam = (Hpx.y - F0px.y) * g7.character.uCm / f;
const Z0w = g7.character.uCm;
const X0w = (F0px.x - Hpx.x) * Z0w / f;
const Dw = { x: g7.walk.path.b.x * 561, y: g7.walk.path.b.y * 396 };
const ZDw = f * hCam / (Hpx.y - Dw.y);
const XDw = (Dw.x - Hpx.x) * ZDw / f;
const dLen = Math.hypot(XDw - X0w, ZDw - Z0w);
let stepErr = 0;
g7.walk.steps.forEach(function(s) {
  const ypx = (s.y + s.h) * 396;
  const xpx = (s.x + s.w / 2) * 561;
  const Z = f * hCam / (Hpx.y - ypx);
  const X = (xpx - Hpx.x) * Z / f;
  const dist = Math.hypot(X - X0w, Z - Z0w);
  stepErr = Math.max(stepErr, Math.abs(dist - s.idx * 60));
});
console.log('walk world step dist err(cm)', stepErr.toExponential(3));
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
