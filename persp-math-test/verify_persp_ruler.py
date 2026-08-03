# -*- coding: utf-8 -*-
"""
P0 数学验证：透视步进尺的核心构造
=================================

验证三个主张：

T1  任意三角形：过垂心 H 作三边平行线；每条平行线与“以对应边的高为直径的圆”
    （即：以该边对角顶点 + 该边垂足为直径的 Thales 圆）相交，交点就是用户描述中
    的“直角顶点 Pᵢ”。三条边共 6 个交点全部落在以 H 为圆心的同一个圆上，
    且半径满足 r² = d·(h−d)（d = H 到该边的距离，h = 该边的高），
    即 r² = 高被 H 分割的两段之积（三边相等）。

T2  真实相机（小孔成像）生成的灭点三角形：
    - 垂心 = 主点（视轴与画面的交点）；
    - H 到三灭点的向量两两内积 = −f²（由此可从任意灭点三角形反解焦距 f）；
    - T1 构造圆的半径 r = f，即“90° 视场圆”；
    - 三方向视场角：FOV = 2·atan(画面该方向半宽 / r)；
    - 灭点距离主点 dᵢ = f·tan(φᵢ)，φᵢ 为该世界方向与视轴的夹角。

T3  原型（PerspCal_v0.0.2.py）公式对照：
    像像素 = 画布像素/视场角 × atan(物体尺寸/物距)；四要素互推（反解物距）。

运行：python verify_persp_ruler.py
"""

import math
import random

EPS = 1e-9


# ---------------------------------------------------------------- 2D 几何工具

def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def cross(a, b):
    return a[0] * b[1] - a[1] * b[0]


def dist(a, b=None):
    if b is None:
        b = (0.0, 0.0)
    return math.hypot(a[0] - b[0], a[1] - b[1])


def norm(v):
    d = math.hypot(v[0], v[1])
    return (v[0] / d, v[1] / d)


def line_intersect(p1, d1, p2, d2):
    """两条直线 p1+t*d1 与 p2+s*d2 的交点（无/平行返回 None）。"""
    den = cross(d1, d2)
    if abs(den) < EPS:
        return None
    t = cross(sub(p2, p1), d2) / den
    return add(p1, mul(d1, t))


def foot_of_perp(p, a, b):
    """点 p 到直线 ab 的垂足。"""
    d = sub(b, a)
    t = dot(sub(p, a), d) / dot(d, d)
    return add(a, mul(d, t))


def circle_line_intersections(center, radius, p, d):
    """圆 (center, radius) 与直线 p+t*d 的交点（0/1/2 个）。"""
    d = norm(d)
    w = sub(p, center)
    a = dot(d, d)
    b = dot(w, d)
    c = dot(w, w) - radius * radius
    disc = b * b - a * c
    if disc < -EPS:
        return []
    if disc < 0:
        disc = 0.0
    s = math.sqrt(disc)
    t1, t2 = (-b - s) / a, (-b + s) / a
    pts = [add(p, mul(d, t1))]
    if abs(t2 - t1) > EPS:
        pts.append(add(p, mul(d, t2)))
    return pts


def orthocenter(A, B, C):
    d_a = norm(sub(C, B))            # BC 方向
    d_b = norm(sub(C, A))            # AC 方向
    n_a = (d_a[1], -d_a[0])          # 垂直于 BC
    n_b = (d_b[1], -d_b[0])          # 垂直于 AC
    return line_intersect(A, n_a, B, n_b)


def altitude_of_side(tri, i):
    """返回第 i 条边（对边顶点 tri[i]，边两端 tri[(i+1)%3], tri[(i+2)%3]）的高：
    顶点、垂足、高长。"""
    v = tri[i]
    a, b = tri[(i + 1) % 3], tri[(i + 2) % 3]
    f = foot_of_perp(v, a, b)
    return v, f, dist(v, f)


def right_angle_points(H, tri, i):
    """用户构造：过 H 作第 i 条边的平行线，与该边“高”为直径的圆求交。
    返回所有直角顶点 Pᵢ（0/1/2 个）。"""
    v = tri[i]
    a, b = tri[(i + 1) % 3], tri[(i + 2) % 3]
    foot = foot_of_perp(v, a, b)
    center = mul(add(v, foot), 0.5)
    radius = dist(v, foot) * 0.5
    d_side = sub(b, a)
    return circle_line_intersections(center, radius, H, d_side)


# ---------------------------------------------------------------- T1 任意三角形

def run_t1(n=4000, seed=20260803):
    rng = random.Random(seed)
    checked = 0
    concyclic_ok = 0
    right_angle_ok = 0
    worst = 0.0
    skipped = 0
    for _ in range(n):
        tri = [(rng.uniform(-100, 100), rng.uniform(-100, 100)) for _ in range(3)]
        H = orthocenter(*tri)
        radii = []          # 每条边上取到的点到 H 的距离
        points = []
        for i in range(3):
            ps = right_angle_points(H, tri, i)
            if not ps:
                skipped += 1
                break
            # 直角验证：P 与“高”的两端点构成直角（P 为直角顶点）
            v, foot, _ = altitude_of_side(tri, i)
            for p in ps:
                if abs(dot(sub(p, v), sub(p, foot))) > 1e-6 * max(1.0, dist(v, foot) ** 2):
                    right_angle_ok -= 10000  # 严重失败标记
                points.append(p)
                radii.append(dist(p, H))
        else:
            checked += 1
            if not radii:
                continue
            r0 = radii[0]
            err = max(abs(r - r0) for r in radii) / max(1e-9, abs(r0))
            worst = max(worst, err)
            if err < 1e-9:
                concyclic_ok += 1
    return dict(checked=checked, skipped=skipped, ok=concyclic_ok, worst=worst,
                right_angle_ok=right_angle_ok)


# ---------------------------------------------------------------- T2 真实相机

def random_orthonormal_triad(rng):
    while True:
        u1 = (rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))
        d = math.sqrt(u1[0] ** 2 + u1[1] ** 2 + u1[2] ** 2)
        if d < 0.5:
            continue
        u1 = (u1[0] / d, u1[1] / d, u1[2] / d)
        v = (rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))
        d2 = dot3(v, u1)
        u2 = (v[0] - d2 * u1[0], v[1] - d2 * u1[1], v[2] - d2 * u1[2])
        d3 = math.sqrt(u2[0] ** 2 + u2[1] ** 2 + u2[2] ** 2)
        if d3 < 0.5:
            continue
        u2 = (u2[0] / d3, u2[1] / d3, u2[2] / d3)
        u3 = (u1[1] * u2[2] - u1[2] * u2[1],
              u1[2] * u2[0] - u1[0] * u2[2],
              u1[0] * u2[1] - u1[1] * u2[0])
        return u1, u2, u3


def dot3(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def run_t2(n=2000, seed=20260803):
    rng = random.Random(seed)
    f = 100.0  # 焦距（画面像素单位）
    h_ok = dot_ok = r_ok = fov_ok = tan_ok = 0
    checked = 0
    worst_h = worst_dot = worst_r = worst_fov = worst_tan = 0.0
    canvas_w, canvas_h = 1920.0, 1080.0
    for _ in range(n):
        u1, u2, u3 = random_orthonormal_triad(rng)
        triad = [u1, u2, u3]
        if any(uz <= 0.05 for _, _, uz in triad):
            continue
        vps = [(f * ux / uz, f * uy / uz) for ux, uy, uz in triad]
        if any(dist(v) > 1e6 for v in vps):
            continue
        checked += 1
        H = orthocenter(*vps)
        err_h = dist(H) / f
        worst_h = max(worst_h, err_h)
        if err_h < 1e-9:
            h_ok += 1

        pairs = [(vps[0], vps[1]), (vps[1], vps[2]), (vps[2], vps[0])]
        dots = [dot(a, b) for a, b in pairs]
        err_dot = max(abs(d + f * f) / (f * f) for d in dots)
        worst_dot = max(worst_dot, err_dot)
        if err_dot < 1e-9:
            dot_ok += 1

        radii = []
        for i in range(3):
            ps = right_angle_points(H, vps, i)
            if not ps:
                break
            radii.extend(dist(p, H) for p in ps)
        else:
            err_r = max(abs(r - f) / f for r in radii)
            worst_r = max(worst_r, err_r)
            if err_r < 1e-9:
                r_ok += 1

        # FOV：圆直径 D=2r=2f；画面该方向长度相对圆直径
        r = f
        fov_h = 2 * math.atan((canvas_w / 2) / r)
        fov_h2 = 2 * math.atan(canvas_w / (2 * r))
        fov_d = 2 * math.atan((math.hypot(canvas_w, canvas_h) / 2) / r)
        err_fov = abs(fov_h - fov_h2) / max(1e-9, abs(fov_h))
        worst_fov = max(worst_fov, err_fov)
        if err_fov < 1e-9 and fov_d > fov_h > 2 * math.atan((canvas_h / 2) / r):
            fov_ok += 1

        for (ux, uy, uz), vp in zip(triad, vps):
            phi = math.acos(max(-1.0, min(1.0, uz)))
            d_expect = f * math.tan(phi)
            err_tan = abs(dist(vp, H) - d_expect) / max(1.0, d_expect)
            worst_tan = max(worst_tan, err_tan)
            if err_tan < 1e-9:
                tan_ok += 1
    return dict(checked=checked, h_ok=h_ok, dot_ok=dot_ok, r_ok=r_ok,
                fov_ok=fov_ok, tan_ok=tan_ok, worst_h=worst_h,
                worst_dot=worst_dot, worst_r=worst_r, worst_fov=worst_fov,
                worst_tan=worst_tan)


# ---------------------------------------------------------------- T3 原型公式

def run_t3():
    # 与 PerspCal_v0.0.2.py 相同的一组输入
    canvas_w, canvas_h = 1920.0, 1080.0
    obj_w, obj_h = 40.0, 160.0      # cm
    u0 = 800.0                      # cm
    f = 50.0                        # mm
    step = 60.0                     # cm
    film_w = 36.0
    film_h = film_w / canvas_w * canvas_h
    fov_w = 2 * math.atan((film_w / 2) / f)
    fov_h = 2 * math.atan((film_h / 2) / f)

    def size_at(u):
        return (canvas_w / fov_w * math.atan(obj_w / u),
                canvas_h / fov_h * math.atan(obj_h / u))

    x1, y1 = size_at(u0)
    u = u0
    results = []
    for k in range(1, 6):
        u -= step
        x2, y2 = size_at(u)
        results.append((k, x2, y2, x2 / x1 * 100.0, y2 / y1 * 100.0))

    # 反解物距：由像高 y1、焦距、画布、物体尺寸推回 u0
    u_back = obj_h / math.tan(y1 * fov_h / canvas_h)
    err_u = abs(u_back - u0) / u0
    # 反解焦距：由物距、尺寸、占比推回 f
    ratio_h = y1 / canvas_h
    fov_back = canvas_h * math.atan(obj_h / u0) / (y1)
    f_back = film_h / (2 * math.tan(fov_back / 2))
    err_f = abs(f_back - f) / f
    return dict(results=results, err_u=err_u, err_f=err_f, u_back=u_back, f_back=f_back)


# ---------------------------------------------------------------- 主流程

def fmt(v):
    return "%.2e" % v


def main():
    print("=== T1 任意三角形：共圆性（过垂心平行线 × 以高为直径的圆） ===")
    t1 = run_t1()
    print("  有效三角形 %d，无交点跳过 %d，共圆通过 %d/%d，最坏相对误差 %s，直角校验通过 %s"
          % (t1["checked"], t1["skipped"], t1["ok"], t1["checked"],
             fmt(t1["worst"]), "是" if t1["right_angle_ok"] >= 0 else "否"))

    print()
    print("=== T2 真实相机灭点三角形 ===")
    t2 = run_t2()
    print("  有效相机位形 %d" % t2["checked"])
    print("  垂心=主点        通过 %d/%d，最坏相对误差 %s" % (t2["h_ok"], t2["checked"], fmt(t2["worst_h"])))
    print("  两两内积=-f^2    通过 %d/%d，最坏相对误差 %s" % (t2["dot_ok"], t2["checked"], fmt(t2["worst_dot"])))
    print("  构造圆半径=f     通过 %d/%d，最坏相对误差 %s" % (t2["r_ok"], t2["checked"], fmt(t2["worst_r"])))
    print("  FOV 公式自洽     通过 %d/%d，最坏相对误差 %s" % (t2["fov_ok"], t2["checked"], fmt(t2["worst_fov"])))
    print("  d=f*tan(phi)     通过 %d/%d，最坏相对误差 %s" % (t2["tan_ok"], t2["checked"] * 3, fmt(t2["worst_tan"])))

    print()
    print("=== T3 原型公式对照（u0=800cm, f=50mm, 步长60cm） ===")
    t3 = run_t3()
    for k, x2, y2, rx, ry in t3["results"]:
        print("  第%d步: 像宽 %.2fpx(%.2f%%) 像高 %.2fpx(%.2f%%)" % (k, x2, rx, y2, ry))
    print("  反解物距 u=%.3f cm（误差 %s）" % (t3["u_back"], fmt(t3["err_u"])))
    print("  反解焦距 f=%.3f mm（误差 %s）" % (t3["f_back"], fmt(t3["err_f"])))

    ok = (t1["ok"] == t1["checked"] and t2["h_ok"] == t2["checked"]
          and t2["dot_ok"] == t2["checked"] and t2["r_ok"] == t2["checked"]
          and t2["fov_ok"] == t2["checked"] and t2["tan_ok"] == t2["checked"] * 3
          and t3["err_u"] < 1e-9 and t3["err_f"] < 1e-9)
    print()
    print("总体结论:", "全部通过" if ok else "存在失败项，请检查输出")


if __name__ == "__main__":
    main()
