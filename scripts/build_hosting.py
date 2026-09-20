#!/usr/bin/env python3
"""公開用ファイルだけをCloudflare向けにまとめる。原音・秘密・開発ファイルは配らない。"""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.cloudflare-public'
FILES = ['bgm_forge.html', 'bgm_forge_standalone.html', 'bgm-score.js', 'bgm-forge.js',
         'favicon.svg', 'ogp.png', 'LICENSE']
tracked = subprocess.check_output(['git', 'ls-files', '-z', 'samples', 'vendor'], cwd=ROOT).decode().split('\0')
FILES += [p for p in tracked if p and (p.endswith(('bank.js', 'manifest.json', 'CREDITS.md', 'README.md', '.tgz')) or Path(p).name in ('LICENSE', 'lame.min.js'))]
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for name in FILES:
    src = ROOT / name
    assert src.stat().st_size <= 25 * 1024 * 1024, f'Cloudflareの25MiB上限を超える: {name}'
    dest = OUT / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest)
shutil.copyfile(ROOT / 'bgm_forge.html', OUT / 'index.html')
(OUT / '_redirects').write_text('/bgm_forge.html / 302\n/bgm_forge_v2.html / 302\n')
(OUT / '_headers').write_text('/\n  Cache-Control: no-cache\n/*.html\n  Cache-Control: no-cache\n')
print(f'Cloudflare用 {len(list(OUT.rglob("*")))} 項目、最大 {max(p.stat().st_size for p in OUT.rglob("*") if p.is_file())} bytes')
