#!/bin/bash
# BGM Forge — 変更をGitHubへ公開する
# ダブルクリックで実行されます。このファイルはリポジトリの中に置いてあるので、
# フォルダごと移動しても動きます。

cd "$(dirname "$0")" || exit 1

if [ ! -d .git ]; then
  echo "このファイルはリポジトリの中に置いてください。"
  read -n 1 -s -r -p "何かキーを押すと閉じます"
  exit 1
fi

echo "▼ 場所"
pwd
echo
echo "▼ 未公開のコミット"
git log --oneline "@{u}..HEAD" 2>/dev/null || git log --oneline -5
echo
if [ -z "$(git log --oneline '@{u}..HEAD' 2>/dev/null)" ]; then
  echo "公開するものはありません。"
  read -n 1 -s -r -p "何かキーを押すと閉じます"
  exit 0
fi

echo "▼ push中..."
if git push; then
  echo
  echo "✅ 公開しました。GitHub Pagesの反映まで1〜2分ほどかかります。"
  echo "   https://air-nakamoto.github.io/bgm-forge/bgm_forge_v2.html"
else
  echo
  echo "❌ 失敗しました。上のメッセージをAIに見せてください。"
fi
echo
read -n 1 -s -r -p "何かキーを押すと閉じます"
