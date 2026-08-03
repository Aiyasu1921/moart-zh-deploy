# -*- coding: utf-8 -*-
"""提取 index.html 中所有内联 <script>，用 node --check 做语法检查。"""

import io
import os
import re
import subprocess
import sys
import tempfile

PATH = r"D:\MyArticles\VsCodeArticles\别人的库\MoArt-ver1248\moart-zh-deploy\index.html"
NODE = r"C:\Users\Lanla\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"


def main():
    with io.open(PATH, "r", encoding="utf-8") as fh:
        t = fh.read()
    scripts = re.findall(r"<script([^>]*)>(.*?)</script>", t, re.S)
    failed = False
    for i, (attrs, body) in enumerate(scripts):
        if "src=" in attrs:
            continue
        fd, tmp = tempfile.mkstemp(suffix=".js")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        r = subprocess.run([NODE, "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            failed = True
            print("SCRIPT %d FAIL:" % i)
            print(r.stderr[:3000])
        else:
            print("SCRIPT %d OK (%d bytes)" % (i, len(body)))
        os.unlink(tmp)
    if failed:
        sys.exit(1)
    print("all inline scripts OK")


if __name__ == "__main__":
    main()
