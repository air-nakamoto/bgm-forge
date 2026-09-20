#!/usr/bin/env python3
"""bgm_forge_v2.html と分割ソースから bgm_forge_standalone.html を作る。

使い方:  python3 scripts/build_standalone.py      （フォルダ直下で実行）

単体起動版は「v2 + 同梱物」であって別系統ではない。編集は必ず分割ソース側に入れ、
このスクリプトで単体版を作り直すこと。単体版を直接編集すると 2026-09-16 と同じ乖離が起きる。

やっていること:
  1. <title> に「— 単体起動版」を付ける
  2. 外部リンクのクレジット2行を、同梱クレジット（CC0全文・LGPL全文・エンコーダー原本）に差し替える
  3. <script src="..."> 4本を中身ごと埋め込む（順序は lamejs → bank → score → forge）
  4. 「意見を送る」（feedback:start〜end の塊）を丸ごと落とす
"""
import base64
import html
import os
import re
import sys
import tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "bgm_forge_v2.html")
OUT = os.path.join(ROOT, "bgm_forge_standalone.html")
SCRIPTS = [
    ("vendor/lamejs/lame.min.js", ' id="lamejs-1-2-1"'),
    ("samples/vsco2/bank.js", ""),
    ("samples/sitar/bank.js", ""),
    ("samples/koto/bank.js", ""),
    ("samples/choir/bank.js", ""),
    ("samples/shinobue/bank.js", ""),
    ("bgm-score.js", ""),
    ("bgm-forge.js", ""),
]
TGZ = "vendor/lamejs/lamejs-1.2.1.tgz"
PRE = '<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'
# v2 側のクレジット2行。ここを変えたら下の2つの正規表現も合わせること。
NOTE_SOURCE = re.compile(r'<p class="note">音源: VSCO 2 Community Edition.*?</p>\n', re.S)
NOTE_LAME = re.compile(r'<p class="note">MP3エンコーダー: lamejs.*?</p>\n', re.S)
# 単体版では下の折りたたみに入るので、分割版向けの1行は落とす。
NOTE_GROOVE = re.compile(r'<p class="note">打楽器の強弱とタイミングは Groove.*?</p>\n', re.S)
# 「意見を送る」は単体版に入れない。オフラインで配る版から外へ出る通信をなくすため。
# 印は HTML コメント（<!-- feedback:start --> …）と CSS コメント（/* feedback:start */ …）の2種類。
FEEDBACK = re.compile(r"(?:<!--|/\*) feedback:start (?:-->|\*/).*?(?:<!--|/\*) feedback:end (?:-->|\*/)\n?", re.S)


def read(rel, mode="r"):
    kw = {"encoding": "utf-8"} if mode == "r" else {}
    with open(os.path.join(ROOT, rel), mode, **kw) as f:
        return f.read()


def bundled_credits():
    """クレジットは要点だけを見せ、全文は開かないと出てこない入れ子にする。
    LGPLは全文の同梱が要るので消さないこと。CC0は義務ではないが同じ形で残している。"""
    credits = "\n\n".join(read("samples/%s/CREDITS.md" % d) for d in ("vsco2", "sitar", "koto", "choir", "shinobue"))
    cc0 = read("samples/vsco2/LICENSE")
    with tarfile.open(os.path.join(ROOT, TGZ)) as t:
        lgpl = t.extractfile("package/src/main/java/COPYING").read().decode("utf-8")
    lame = read("vendor/lamejs/LICENSE") + "\n\n" + lgpl
    b64 = base64.b64encode(read(TGZ, "rb")).decode("ascii")

    def sheet(title, body):
        return "<details><summary>%s</summary>%s%s</pre></details>" % (title, PRE, html.escape(body))

    return (
        '<p class="note">音源: VSCO 2 Community Edition / Versilian Studios · CC0。'
        '32サンプルをモノラル32 kHzへ変換して同梱。'
        '<a href="#bundledCredits">クレジットとライセンス</a></p>\n'
        '<p class="note">単体起動版：このHTMLだけで作曲・再生・WAV／MP3／MIDI保存ができます。'
        'MP3は192kbps・ステレオです。</p>'
        '<details id="bundledCredits"><summary>クレジットとライセンス</summary>'
        '<p><b>このツールで作った曲</b>　作った人のものです。自由に使えます（CC0 1.0 相当）。'
        'クレジット表記・使用報告は不要で、商用利用・改変・再配布ができます。'
        '同梱音源がCC0なので、素材由来の条件が曲に付いてくることはありません。</p>'
        '<p><b>ツール本体のコード</b>　MIT License. Copyright (c) 2026 air-nakamoto</p>'
        '<p><b>音源</b>　VS Chamber Orchestra: Community Edition（VSCO 2 CE）／ Versilian Studios · CC0 1.0。'
        'ピアノ18音・弦6音・フルート4音・打楽器4音を、モノラル32 kHzへ変換して同梱。'
        '<a href="https://github.com/sgossner/VSCO-2-CE">原典</a></p>'
        '<p><b>MP3エンコーダー</b>　lamejs 1.2.1 / LAME · LGPL。未改変です。'
        '<a href="https://lame.sourceforge.net/">LAME</a> · '
        '<a href="https://github.com/zhuker/lamejs">lamejs</a> · '
        '<a download="lamejs-1.2.1.tgz" href="data:application/gzip;base64,' + b64 + '">ソース一式を保存</a></p>'
        '<p><b>実録音の音源</b>　いずれも Freesound · CC0 1.0。'
        'シタール ／ deleted_user_229898 '
        '<a href="https://freesound.org/people/deleted_user_229898/sounds/42192/">42192</a>、'
        '箏 ／ RutgerMuller '
        '<a href="https://freesound.org/people/RutgerMuller/sounds/365242/">365242</a>、'
        '笛 ／ t-man95 '
        '<a href="https://freesound.org/people/t-man95/sounds/553217/">553217</a>、'
        '合唱 ／ ShangusBurger '
        '<a href="https://freesound.org/people/ShangusBurger/sounds/764124/">764124</a>。'
        '加工の内容は下の「音源の原典・加工内容」に全部あります。</p>'
        '<p><b>打楽器の強弱とタイミング</b>　Groove MIDI Dataset ／ Magenta · Google · CC BY 4.0。'
        '統計だけを参考にしており、データは同梱していません。'
        '<a href="https://magenta.tensorflow.org/datasets/groove">データセット</a> · '
        '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p>'
        + sheet("音源の原典・加工内容", credits)
        + sheet("CC0 1.0 全文（音源）", cc0)
        + sheet("LGPL 2.1 全文（MP3エンコーダー）", lame)
        + "</details>"
    )


def main():
    doc = read("bgm_forge_v2.html")
    # MIT本文だけをコメントに同梱。後続のMarkdown区切り（---）は含めない。
    mit = read("LICENSE").split("\n---", 1)[0].strip()
    assert mit.startswith("MIT License") and "--" not in mit, "MIT本文をHTMLコメントにできない"
    doc = doc.replace("<head>", "<head>\n<!--\nBGM Forge\n" + mit + "\n-->", 1)
    doc, n = re.subn(r"<title>BGM Forge V2</title>",
                     "<title>BGM Forge V2 — 単体起動版</title>", doc, count=1)
    assert n == 1, "<title> が見つからない"
    icon = base64.b64encode(read("favicon.svg", "rb")).decode("ascii")
    doc, n = re.subn(r'href="favicon\.svg[^"\s]*"',
                     'href="data:image/svg+xml;base64,' + icon + '"', doc)
    assert n == 1, "ファビコンが見つからない"
    assert NOTE_SOURCE.search(doc) and NOTE_LAME.search(doc), "クレジット行が見つからない"
    doc = NOTE_LAME.sub("", doc, count=1)
    doc = NOTE_GROOVE.sub("", doc, count=1)
    doc = NOTE_SOURCE.sub(lambda m: bundled_credits(), doc, count=1)

    doc, n = FEEDBACK.subn("", doc)
    assert n == 6, "feedback の塊が %d 個（想定 6）" % n
    assert "feedback" not in doc, "単体版に意見送信の痕跡が残っている"

    tags = list(re.finditer(r'<script src="([^"?]+)[^"]*"></script>', doc))
    assert len(tags) == len(SCRIPTS), "<script src> の数が %d（想定 %d）" % (len(tags), len(SCRIPTS))
    out, last = [], 0
    for tag, (rel, attr) in zip(tags, SCRIPTS):
        assert tag.group(1) == rel, "script の順序が違う: %s ≠ %s" % (tag.group(1), rel)
        body = read(rel)
        if not body.endswith("\n"):
            body += "\n"
        out.append(doc[last:tag.start()])
        out.append("<script%s>\n%s\n</script>" % (attr, body))
        last = tag.end()
    out.append(doc[last:])
    doc = "".join(out)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(doc)
    print("wrote %s (%.1f MB)" % (os.path.relpath(OUT, ROOT), len(doc.encode("utf-8")) / 1e6))


if __name__ == "__main__":
    sys.exit(main())
