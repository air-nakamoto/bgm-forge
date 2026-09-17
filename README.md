# BGM Forge

TRPGの場面に合わせたループBGMを、ブラウザ内で自動作曲するツールです。

## 使い方

手軽に使う場合は `bgm_forge_standalone.html` をダウンロードし、ブラウザで開いてください。音源・作曲処理・MP3エンコーダーを1ファイルに収録しています。

開発時は `bgm_forge_v2.html` を使います。リポジトリをまとめてダウンロードし、ファイル構成を変えずに開いてください。

1. 場面を選び、「新しい曲を作る」を押します。
2. 「再生」で確認します。
3. 必要に応じて「この曲を調整」で伴奏・音色・テンポなどを変更します。
4. WAV・MP3・MIDIのいずれかで保存します。

## 開発用ファイル

- `bgm_forge_v2.html`：画面とスタイル
- `bgm-score.js`：作曲エンジン
- `bgm-forge.js`：音声生成・再生・保存・画面処理
- `samples/vsco2/`：内蔵音源とクレジット
- `vendor/lamejs/`：MP3エンコーダー
- `scripts/build_standalone.py`：分割ソースから単体版を生成

修正は分割ソースへ行い、最後に次のコマンドで単体版を作り直します。

```sh
python3 scripts/build_standalone.py
```

## 収録内容

- 18種類のTRPG場面
- 10種類の音色
- 場面別・手動選択の伴奏パターン
- ループ用／終止あり
- WAV、MP3（192 kbps）、MIDI出力
- 外部API・アカウント・ネット接続不要

## 第三者素材

- VS Chamber Orchestra: Community Edition（VSCO 2 CE）：CC0 1.0
- lamejs 1.2.1 / LAME：LGPL
- Groove MIDI Dataset：CC BY 4.0。打楽器の強弱とタイミングの統計を参考にしています。データ自体は収録していません。

詳しいクレジットとライセンスは、単体版HTML内および各素材フォルダに収録しています。
