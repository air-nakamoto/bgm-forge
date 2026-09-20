#!/bin/bash
# BGM Forge — Cloudflareへ公開し、ソースをGitHubへ保存する
cd "$(dirname "$0")" || exit 1
finish() { echo; read -n 1 -s -r -p "何かキーを押すと閉じます"; }
fail() { echo "❌ 失敗しました。上のメッセージをAIに見せてください。"; finish; exit 1; }
[ -d .git ] || fail
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "未コミットの変更があります。先に変更を確認してコミットしてください。"
  finish; exit 1
fi
echo "▼ 未公開のコミット"
git log --oneline '@{u}..HEAD'
echo "▼ 単体版の生成と検証"
python3 scripts/build_standalone.py || fail
node tests/scene-variation.cjs || fail
git diff --quiet || { echo "生成物が更新されました。内容を確認してコミットしてください。"; finish; exit 1; }
python3 scripts/build_hosting.py || fail
echo "▼ 意見フォームの中継を更新"
npx --yes wrangler@4.72.0 deploy --config worker/wrangler.toml || fail
echo "▼ BGM ForgeをCloudflareへ公開"
npx --yes wrangler@4.72.0 deploy --config hosting/wrangler.toml || fail
echo "▼ ソースをGitHubへ保存"
git push || fail
echo "✅ 公開しました。 https://bgm-forge.suihei.workers.dev/"
finish
