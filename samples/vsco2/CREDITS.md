# 同梱音源について

VS Chamber Orchestra: Community Edition (VSCO 2 CE)

- 作者: Versilian Studios。録音: Sam Gossner & Simon Dalzell。サンプル編集: Elan Hickler / Soundemote。
- 原典: https://github.com/sgossner/VSCO-2-CE
- 公式説明: https://versilian-studios.com/vsco-community/
- ライセンス: CC0 1.0 Universal。全文は同じフォルダの LICENSE。
- 固定リビジョン: 440300901dfe9275fd84e0b7763af1f8443ae62e

BGM Forgeにはアップライトピアノ18音（9音高×2強度）、バイオリンセクション6音、フルート4音、打楽器4音を収録しています。各原本のURLとSHA-256は manifest.json に記録しています。

容量とオフライン対応のため、モノラル32 kHz / 16-bit PCMに変換し、先頭の無音除去、ピーク調整、末尾フェードを適用しました。弦とフルートには持続用クロスフェードループを作成しました。音高は最寄りのサンプルから再生速度で補間します。ピアノと弦・フルートのオクターブ命名規則は異なるため、manifestでMIDI音高を明示しています（フルートは実音を測定して確認しました）。

bank.js はこの加工済みPCMをBase64で保持します。file:// でも外部通信やfetchなしで読み込むための形式です。HTMLを移動するときは bgm-score.js / bgm-forge.js / samples / vendor も一緒に移動してください。

再作成: manifestの原本を /tmp/bgm-vsco-original/{id}.wav に取得後、python3 scripts/build_sample_bank.py を実行します（numpyとffmpegが必要）。
