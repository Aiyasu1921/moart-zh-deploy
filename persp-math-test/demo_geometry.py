# -*- coding: utf-8 -*-
"""
P0.5 演示数据：为 HTML 静态渲染验证准备一组"写死"的灭点三角形，
输出垂心、90° 圆半径（=焦距 px）、三向 FOV、以及三个演示步进矩形。
数值应与浏览器中覆盖层 HUD 显示一致，用于人工核对。
"""

import math

PAPER_W, PAPER_H = 561.0, 396.0


def to_layer(nx, ny):
    return (nx * PAPER_W, ny * PAPER_H)


def line_intersect(p1, d1, p2, d2):
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-12:
        return None
    t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
    return (p1[0] + t * d1[0], p1[1] + t * d1[1])


def foot_of_perp(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    return (a[0] + t * dx, a[1] + t * dy)


def orthocenter(A, B, C):
    d_bc = (C[0] - B[0], C[1] - B[1])
    d_ac = (C[0] - A[0], C[1] - A[1])
    return line_intersect(A, (d_bc[1], -d_bc[0]), B, (d_ac[1], -d_ac[0]))


def circle_line(center, radius, p, d):
    dl = math.hypot(*d)
    if dl <= 0:
        return []
    dx, dy = d[0] / dl, d[1] / dl
    wx, wy = p[0] - center[0], p[1] - center[1]
    b = wx * dx + wy * dy
    c = wx * wx + wy * wy - radius * radius
    disc = b * b - c
    if disc < -1e-12:
        return []
    disc = max(0.0, disc)
    s = math.sqrt(disc)
    return [(p[0] + (-b - s) * dx, p[1] + (-b - s) * dy),
            (p[0] + (-b + s) * dx, p[1] + (-b + s) * dy)]


def right_angle_points(H, tri, i):
    v = tri[i]
    a, b = tri[(i + 1) % 3], tri[(i + 2) % 3]
    foot = foot_of_perp(v, a, b)
    center = ((v[0] + foot[0]) / 2, (v[1] + foot[1]) / 2)
    r = math.hypot(v[0] - foot[0], v[1] - foot[1]) / 2
    return circle_line(center, r, H, (b[0] - a[0], b[1] - a[1]))


def focal_from_vps(H, vps):
    s = 0.0
    n = 0
    for i in range(3):
        for j in range(i + 1, 3):
            s += (vps[i][0] - H[0]) * (vps[j][0] - H[0]) + (vps[i][1] - H[1]) * (vps[j][1] - H[1])
            n += 1
    return math.sqrt(max(0.0, -s / n))


def main():
    # 写死的三个灭点（norm 坐标，真实相机生成）：V1 左 / V2 上 / V3 右
    # 来源：中心化相机（主点=纸面中心，f=300px）+ 正交方向三元组，
    # 已确认垂心在三角形内（锐角）、三边直角点均存在。
    vps_n = [(-0.16389, 0.99949), (0.41696, -0.87052), (1.06211, 0.85041)]
    vps = [to_layer(*v) for v in vps_n]
    H = orthocenter(*vps)
    f = focal_from_vps(H, vps)
    r = f  # 已验证：构造圆半径 = 焦距

    # 三边直角顶点（共圆于 H，半径 r）——用于交叉验证
    for i in range(3):
        ps = right_angle_points(H, vps, i)
        for p in ps:
            dd = math.hypot(p[0] - H[0], p[1] - H[1])
            print("P%d: (%.2f, %.2f)   |PH| = %.4f (r=%.4f)" % (i + 1, p[0], p[1], dd, r))

    fov_h = 2 * math.degrees(math.atan((PAPER_W / 2) / f))
    fov_v = 2 * math.degrees(math.atan((PAPER_H / 2) / f))
    fov_d = 2 * math.degrees(math.atan((math.hypot(PAPER_W, PAPER_H) / 2) / f))
    f_mm = 36.0 * f / PAPER_W

    print("V1(%.2f, %.2f) V2(%.2f, %.2f) V3(%.2f, %.2f)" % (vps[0][0], vps[0][1], vps[1][0], vps[1][1], vps[2][0], vps[2][1]))
    print("H = (%.2f, %.2f)  圆心在纸面内: %s" % (H[0], H[1], 0 <= H[0] <= PAPER_W and 0 <= H[1] <= PAPER_H))
    print("r = f = %.2f px" % r)
    print("FOV_h = %.2f°, FOV_v = %.2f°, FOV_d = %.2f°" % (fov_h, fov_v, fov_d))
    print("35mm 等效焦距 = %.2f mm" % f_mm)

    # 演示步进矩形（与 index.html 中 PERSP_DEBUG_BOXES 一致）
    print("演示步进矩形（layer px）:")
    boxes = [(236, 238, 88, 148), (252, 262, 62, 104), (262, 282, 44, 72)]
    for k, (x, y, w, h) in enumerate(boxes, 1):
        print("  step%d: (%.1f, %.1f) %.1f x %.1f  脚底 y=%.1f" % (k, x, y, w, h, y + h))


if __name__ == "__main__":
    main()
