# 音色変更後の旋律・伴奏バランス比較

2026-09-23。製品の音量処理は変更していない。試聴候補の評価段階。

## 条件と方法

夜空・儀式・和風 × オルゴール・合唱・箏 × seed 2026/101＝18条件。30秒指定、旋律あり・sparse、既定テンポ。compose後にadjustで音色を変更。Chrome OfflineAudioContext、44.1kHz、残響とループ末尾の折り返しを含む。

分析用ソースだけで最終正規化前の波形を取得し、同じ譜面を旋律とそれ以外に分離して36ステムをレンダリング。RMS差は知覚音量の差ではなく、全曲平均のエネルギー比である。

## 結果

| 場面 | 音色 | seed | 旋律／伴奏 RMS差 dB | 候補の旋律倍率 |
|---|---|---:|---:|---:|
| night | musicbox | 2026 | 16.59 | 0.148 |
| night | musicbox | 101 | 13.42 | 0.213 |
| night | choir | 2026 | 0.40 | 0.955 |
| night | choir | 101 | -3.76 | 1.000 |
| night | koto | 2026 | 17.18 | 0.138 |
| night | koto | 101 | 12.81 | 0.229 |
| ritual | musicbox | 2026 | 13.73 | 0.206 |
| ritual | musicbox | 101 | 5.07 | 0.558 |
| ritual | choir | 2026 | -1.20 | 1.000 |
| ritual | choir | 101 | -10.77 | 1.000 |
| ritual | koto | 2026 | 14.73 | 0.184 |
| ritual | koto | 101 | 8.44 | 0.379 |
| japanese | musicbox | 2026 | 6.35 | 0.481 |
| japanese | musicbox | 101 | 5.17 | 0.551 |
| japanese | choir | 2026 | -14.64 | 1.000 |
| japanese | choir | 101 | -15.15 | 1.000 |
| japanese | koto | 2026 | 6.73 | 0.461 |
| japanese | koto | 101 | 8.92 | 0.358 |

## 試聴候補

Aは分離ステムを加算して現行と同じ全曲RMS調整・tanh・ピーク制限を適用した現行相当ミックス。Bはその増幅量を固定し、旋律RMSが伴奏RMSを超える場合だけ旋律を下げた実験。0 dB差は最適値ではなく、変化を確認するための仮基準。持続音と減衰音の聴感が等しくなるという意味ではない。

Bは再正規化しないため、全体音量も小さくなる。伴奏を保ったまま旋律を下げる効果を聴く比較であり、等ラウドネス比較ではない。現行相当Aはステム合成であり、製品出力とのサンプル単位一致は未検証。合唱は多くの条件でB=A。むやみに増幅せず、発音中の聞こえ方を次に確認する。

seed 2026の9組18 WAVを作成。最初は夜空のオルゴール、次に和風の箏を同じ試聴音量で比較する。

- [night / musicbox / A](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/night-musicbox-A.wav>)

- [night / musicbox / B](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/night-musicbox-B.wav>)

- [japanese / koto / A](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/japanese-koto-A.wav>)

- [japanese / koto / B](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/japanese-koto-B.wav>)

- [ritual / choir / A](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/ritual-choir-A.wav>)

- [ritual / choir / B](</Users/air/Documents/Codex/2026-09-17/documents-plugin-documents-openai-primary-runtime/work/bgm-forge/Claude outputs/balance-20260923/ritual-choir-B.wav>)

## 検証・再現

18条件の数値は有限、A/Bピークは0.95以下。18 WAVのチャンネル数・サンプルレート・非空を検査。元の回帰テストはPASS。試聴による採用判断、全17音色、長尺、旋律密度と音域の全組合せは未検証。

`NODE_PATH=<playwrightのnode_modules> node scripts/audit_balance.cjs` で再現。出力先にmetrics.json、sources.json、WAVを保存する。音源はClaude outputs配下のローカル成果物でGitには含めない。

次の一手：A/B試聴で目立ちすぎ・埋もれを判断し、必要なら減音量を弱めた候補を追加。その後に本体の音色補正と自動増幅の設計を決める。
