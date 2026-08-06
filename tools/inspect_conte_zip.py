# -*- coding: utf-8 -*-
"""检查 .conte.zip：列出条目，导出主 JSON，检查 perspGuide 是否存在及其内容。"""

import io
import json
import sys
import zipfile

ZIP = r"C:/Users/Lanla/Desktop/untitled_00.conte.zip"


def main():
    with zipfile.ZipFile(ZIP) as z:
        names = z.namelist()
        print("entries:", len(names))
        for n in names:
            info = z.getinfo(n)
            print("  %s  (%d bytes)" % (n, info.file_size))
        # 找主 JSON（.json 或 .conte.json）
        json_names = [n for n in names if n.lower().endswith((".json", ".conte"))]
        print("json-like entries:", json_names)
        if not json_names:
            print("no json entry found")
            return
        target = json_names[0]
        data = z.read(target)
        try:
            text = data.decode("utf-8-sig")
            obj = json.loads(text)
        except Exception as e:
            print("decode/parse failed:", e)
            return
        print("project keys:", sorted(obj.keys())[:40])
        if "perspGuide" in obj:
            pg = obj["perspGuide"]
            print("perspGuide PRESENT")
            print("  stage:", pg.get("stage"))
            print("  lines:", len(pg.get("lines") or []))
            print("  vps:", len(pg.get("vps") or []))
            print("  h:", pg.get("h"))
            print("  focalPx:", pg.get("focalPx"))
            print("  character:", pg.get("character"))
            print("  walk:", {k: (v if not isinstance(v, list) else "list(%d)" % len(v)) for k, v in (pg.get("walk") or {}).items()})
        else:
            print("perspGuide MISSING")
            # 打印 schemaVersion 等元信息帮助判断保存版本
            print("schemaVersion:", obj.get("schemaVersion"))
            print("kind:", obj.get("kind"))
            print("title:", obj.get("title"))


if __name__ == "__main__":
    main()
