# -*- coding: utf-8 -*-
"""
一次性脚本：MoArt-aiyasu 更名 + 版本重置（ver1248 -> ver1）。

对 moart-zh-deploy/index.html 做精确子串替换，每个替换都断言出现次数，
全部匹配成功才写回文件（UTF-8，无 BOM，保留原换行风格）。
执行后需同步到根目录 moart-ver1248.html（两文件此前字节一致）。
"""

import io
import sys

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"

REPL = [
    # (旧串, 新串, 期望出现次数)
    ('alt="MoArt"', 'alt="MoArt-aiyasu"', 2),                      # 品牌字标 alt ×2
    ('>MoArt</span>', '>MoArt-aiyasu</span>', 1),                   # 版本信息 App 名
    ('>MoArt ガイドブック</span>', '>MoArt-aiyasu ガイドブック</span>', 1),  # 指南标题静态回退文本
    ('>ver1248</span>', '>ver1</span>', 1),                         # 版本信息版本号
    ("const APP_NAME = 'MoArt';", "const APP_NAME = 'MoArt-aiyasu';", 1),
    ("const APP_DISPLAY_VERSION = '1248';", "const APP_DISPLAY_VERSION = '1';", 1),
    ("const SHARE_TAGS = 'MoArt';", "const SHARE_TAGS = 'MoArt-aiyasu';", 1),
    ("app: 'MoArt',", "app: 'MoArt-aiyasu',", 1),                   # 导出 auto-sheet 的应用标识
    # 指南手册标题（四语）
    ("zh: 'MoArt 指南手册'", "zh: 'MoArt-aiyasu 指南手册'", 1),
    ("ja: 'MoArt ガイドブック'", "ja: 'MoArt-aiyasu ガイドブック'", 1),
    ("ko: 'MoArt 가이드북'", "ko: 'MoArt-aiyasu 가이드북'", 1),
    ("en: 'MoArt guidebook'", "en: 'MoArt-aiyasu guidebook'", 1),
    # 指南手册导语（四语）
    ("zh: 'MoArt 是一个单文件工具", "zh: 'MoArt-aiyasu 是一个单文件工具", 1),
    ("ja: 'MoArt は原画とコンテ", "ja: 'MoArt-aiyasu は原画とコンテ", 1),
    ("ko: 'MoArt는 원화와 콘티", "ko: 'MoArt-aiyasu는 원화와 콘티", 1),
    ("en: 'MoArt is a single-file tool", "en: 'MoArt-aiyasu is a single-file tool", 1),
]


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        text = fh.read()

    for old, new, expect in REPL:
        if new in text:                # 已应用过则跳过（幂等，可重复运行）
            continue
        n = text.count(old)
        if n != expect:
            sys.exit("FAIL: %r 出现 %d 次，预期 %d 次" % (old, n, expect))
        text = text.replace(old, new)

    with io.open(PATH, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    print("OK: 替换完成并写回（已应用项自动跳过）")


if __name__ == "__main__":
    main()
