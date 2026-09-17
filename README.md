# BGM Forge

TRPGの場面に合わせたBGMをブラウザ内で自動作曲するツールです。現行のHTML＋JavaScript構成です。

## 使い方

1. このリポジトリの「Code → Download ZIP」でダウンロードし、解凍します。
2. `bgm_forge_standalone.html` をブラウザで開きます。
3. 場面を選んで曲を作り、「再生」で確認します。
4. 「この曲を調整」で設定を変更できます。
5. 必要な曲をWAV・MP3・MIDIで保存します。

HTML内にJavaScript・音源・MP3エンコーダーを同梱しています。外部CDNやサーバーの起動は不要です。テイクはページを閉じると失われるため、必要な曲はファイルとして保存してください。

## 同梱物・ライセンス

- VSCO 2 Community Edition音源：CC0 1.0。原典 https://github.com/sgossner/VSCO-2-CE
- lamejs 1.2.1 / LAME：LGPL。原典 https://github.com/zhuker/lamejs
- 詳細なクレジットとライセンスはHTML内に収録しています。lamejs 1.2.1のソースアーカイブもHTML内のリンクから保存できます。
- 第三者素材のライセンスはそれぞれの素材に適用されます。BGM Forge独自コード全体にCC0を適用するものではありません。

このリポジトリには自動作曲ツールの実行ファイルと使い方のみを収録しています。
