# BGM Forge

場面に合わせたループBGMを、ブラウザ内で自動作曲するツールです。

公開サイト: https://bgm-forge.suihei.workers.dev/

## 使い方

公開サイトにアクセスしてご利用ください。
ローカルで手軽に使いたい場合は `bgm_forge_standalone.html` をダウンロードし、ブラウザで開いて利用可能です。
音源・作曲処理・MP3エンコーダーを1ファイルに収録しています。

開発時は `bgm_forge.html` を使います。リポジトリをまとめてダウンロードし、ファイル構成を変えずに開いてください。

1. 場面を選び、「新しい曲を作る」を押します。
2. 「再生」で確認します。
3. 必要に応じて「この曲を調整」で伴奏・音色・テンポなどを変更します。
4. WAV・MP3・MIDIのいずれかで保存します。

テイクは最大12曲まで保持します（長い曲ではメモリ上限により少なくなります）。
各テイクの枠内にある再生・停止ボタンでも操作できます。ページの再読み込みで曲は消えるため、必要な曲はダウンロードしてください。

## 操作ガイドと共有画像

保存欄には「作成した曲を、ここからダウンロード（保存ボタンを押す）」と表示します。
再生の案内は通常「聴いてみる」、微調整して作り直した曲は「作り直した曲を　聴いてみる」に変わります。

公開はリポジトリ直下の `公開する.command` から行います。

## 開発用ファイル

- `bgm_forge.html`：画面とスタイル
- `bgm-score.js`：作曲エンジン
- `bgm-forge.js`：音声生成・再生・保存・画面処理
- `samples/vsco2/`：内蔵音源とクレジット
- `samples/sitar/`：CC0実録音シタール、測定音高・加工情報とクレジット
- `samples/koto/` `samples/shinobue/` `samples/choir/`：CC0実録音の箏・笛・合唱。各フォルダに測定音高と加工情報
- `worker/`：「意見を送る」をDiscordへ中継する Cloudflare Worker（分割版だけの機能。単体版には入りません）
- `vendor/lamejs/`：MP3エンコーダー
- `favicon.svg`：ブラウザのタブ用アイコン（単体版には埋め込み）
- `ogp.svg` / `ogp.png`：共有画像の編集元 / 公開用PNG（1200×630px）
- `scripts/build_standalone.py`：分割ソースから単体版を生成
- `scripts/build_sitar.py` `build_koto.py` `build_shinobue.py` `build_choir.py`：原音から同梱バンクを作り直す

本ツールの開発は、Claude（ClaudeCode）・ChatGPT（Codex）を用いて実施されています。
継続してAIに作業を頼むときは、先に `AGENTS.md`（開発ルール）と `HANDOVER.md`（経緯と計測値）を読ませてください。
開発目標（安定した品質・場面内の幅・自然な構成・場面拡充）と、長尺の展開・編集後の音量バランスについては、[現行の問題・計測結果・対策案](docs/long-form-and-timbre-balance.md)を参照してください。長尺の内声切り替えと編集尺の再計算は実装済みで、別旋律・別和声と音量バランスの聴感評価は継続中です。

修正は分割ソースへ行い、最後に次のコマンドで単体版を作り直します。

```sh
python3 scripts/build_standalone.py
```

## 場面ごとの作曲

伴奏だけで場面の違いが出るよう、24場面それぞれにリズム・音域・和音の移動間隔・休符・打楽器のルールを持たせています。
各場面には3通りの伴奏構成があり、同じ場面で続けて生成すると直前と異なる構成を選びます。（メロディーは初期状態オフのものがほとんどで、一部メロディーがついています）
「場面におまかせ」で場面専用の伴奏を使います。手動でアルペジオ等を選んだ場合は、その指定を優先します。
伴奏の作り直しでは、元のメロディーとコード進行を保持します。

作曲処理の検証:

```sh
node tests/scene-variation.cjs
```

## 収録内容

- 24種類の場面（6列×4行。行ごとに 日常／旅／情緒／緊張、行の中は左から右が物語の順）
- 17種類の音色。うち4種は実録音（シタール・箏・笛・合唱。すべてCC0）
- 場面別・手動選択の伴奏パターン
- ループ用／終止あり
- WAV、MP3（192 kbps）、MIDI出力
- 外部API・アカウント・ネット接続不要

## 生成物のライセンス

**このツールで作った曲は、作った人のものです。自由に使ってください（CC0 1.0 相当）。**

- クレジット表記は不要です
- 商用利用できます
- 改変・再配布できます
- 使用報告や制作者への連絡は要りません
- 動画・配信・ゲーム・頒布物、用途を問いません

同梱音源はCC0（パブリックドメイン相当）なので、素材由来の条件が生成物に付いてくることはありません。
MP3エンコーダーのLGPLは変換器に対するもので、書き出した音声には及びません。
打楽器の統計を参考にした Groove MIDI Dataset は CC BY 4.0 ですが、データそのものは含まれていないため、
生成物に表示義務は生じません。

## ソースコードのライセンス

MIT License（`LICENSE`）。著作権表示を残せば、自由に使用・改変・再配布できます。

## 第三者素材

- VS Chamber Orchestra: Community Edition（VSCO 2 CE）：CC0 1.0
- sitar01.flac / deleted_user_229898（Freesound 42192）：CC0 1.0。民族の旋律・内声に使用。出典・加工情報は `samples/sitar/CREDITS.md`。
- Japan_Koto_Improv / RutgerMuller（Freesound 365242）：CC0 1.0。和風に使用。`samples/koto/CREDITS.md`。
- Oriental flute / t-man95（Freesound 553217）：CC0 1.0。神楽の笛に使用。`samples/shinobue/CREDITS.md`。
- CRWDSing U Ooh Vowel / ShangusBurger（Freesound 764124）：CC0 1.0。合唱に使用。`samples/choir/CREDITS.md`。
- lamejs 1.2.1 / LAME：LGPL 2.1（未改変。原本一式を `vendor/lamejs/lamejs-1.2.1.tgz` として同梱）
- Groove MIDI Dataset：CC BY 4.0。打楽器の強弱とタイミングの統計を参考にしています。データ自体は収録していません。

詳しいクレジットとライセンスは、単体版HTML内および各素材フォルダに収録しています。

## Cloudflareへの公開

`公開する.command` は単体版生成・テスト・公開用ファイルの抽出を行い、意見フォーム用Worker、本体の静的アセットを順にデプロイしてからGitHubへpushします。初回はCloudflareログインが必要です。
本体の設定は `hosting/wrangler.toml`、配布用生成物は `.cloudflare-public/`（Git管理外）。`scripts/build_hosting.py` が必要なファイルとライセンスだけを集めます。GitHub Pagesの旧ページは新サイトへ移動します。
