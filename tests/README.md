# テストの実行

## 通常テスト（必須）

リポジトリ直下で実行する。Node.js 22以上、PATH上のPython 3とGitが必要。npmパッケージ・ブラウザ・原音・ネット接続は不要。

```sh
npm test
# 同じ入口。着手前の既存コマンドも引き続き使える
node tests/scene-variation.cjs
```

`scene-variation.cjs` は `feedback.cjs`、`hosting.cjs`、`long-form-extension.cjs` も子プロセスで実行する。失敗は終了コードに伝わる。

| 検査 | 範囲 |
|---|---|
| scene-variation | 7,200作曲、6,912長尺条件、1,632短尺、816場面ケースなど。単体版一致・JS参照ハッシュも検査 |
| long-form-extension | 4,608条件：24場面×6テンポ×2seed×旋律有無×4伴奏経路×新規／編集。90→120秒の伴奏保持とA復帰（96 BPM未満8拍／以上16拍） |
| feedback | 分類・入力検証・オリジン・クールダウン等。実送信しない |
| hosting | OS一時フォルダ内に公開ファイルを生成し、入口・素材・除外対象・リダイレクト等を確認。成功・失敗時とも後片付け |

hostingテストは `.cloudflare-public/` を使用しない。`build_hosting.py --output <新規パス>` は既存パスを拒否する。出力先の親フォルダは呼出側で用意する（テストではmkdtempで作成）。引数なしの公開ビルドは従来どおり `.cloudflare-public/` を再生成する。

## ブラウザテスト（別入口）

開発用依存だけを `package-lock.json` に固定する。製品のHTML・配布ファイルには追加しない。

```sh
npm ci
npm run test:browser:install
npm run test:browser
```

Playwright 1.63.0と、それに対応するChromium（revision 1243）を使う。システムのChromeや `NODE_PATH` に依存しない。初回セットアップにはネット接続が必要。Linuxで共有ライブラリが不足する場合は `npx playwright install --with-deps chromium` でOS依存も準備する。

通常のブラウザ入口はplayback-clock・balance-audio・dialog-keyboardの3本を最後まで実行し、1本でも失敗すれば終了コード1。実行対象の依存不足・WAV不足も失敗とする。幻想のwonder-pad-audioは採用条件の再確認待ちとして集計から外し、入口で毎回 `PENDING (not PASS)` と表示する。幻想を合格扱いしたり、不意の失敗を保留へ変換したりはしない。

| テスト | 前提と検査範囲 |
|---|---|
| playback-clock | 採用WAV不要。分割／単体版×通常／動きを減らす設定の4条件。位置・シーク・ループ・一時停止／再開・停止・実尺表示 |
| balance-audio | 下記の夜空の採用WAVが必要。seed 2026・76 BPM・musicbox・30秒・旋律sparse・採用時の `innerShift=0` を固定。16bit PCM差最大1以下・ピーク0.95以下 |
| dialog-keyboard | 採用WAV不要。分割／単体版×390・820px。使い方・詳細（先頭2つ）・ライセンス・意見フォームで、Tab/Shift+Tabの巡回、Esc・×・背景での閉じとフォーカスの復帰、スクロール固定の解除。意見は実送信しない |
| wonder-pad-audio（通常集計外・再確認待ち） | 下記の幻想の採用WAVが必要。seed 2026・60 BPM・glass・90秒・旋律なし。16bit PCM差最大1以下・ピーク0.95以下 |

個別の入口：

```sh
npm run test:browser:playback
npm run test:browser:audio # 夜空の採用音比較
npm run test:browser:dialog # ダイアログのキーボード操作
npm run test:browser:pending # 幻想の旧採用音比較。現仕様とは不一致で終了コード1
# 任意のスクリーンショット保存先（390px・820px）
node tests/playback-clock.cjs /tmp/bgm-forge-playback
```

### 採用WAV（Git管理外）

原本を持つ作業者から次のファイルを受け取り、リポジトリ直下からの相対位置に置く。公開ダウンロード先は用意していない。現在のレンダリングから期待WAVを作り直すと採用音との比較にならないため、自動生成・自動更新しない。

| ファイル | SHA-256 |
|---|---|
| `Claude outputs/balance-20260923/night-musicbox-B.wav` | `60671ef219202f7df34cb5d1bb6f82843b2364af5e0bf3ea53a24ee7c2ec7f54` |
| `Claude outputs/wonder-pad-correct-20260924/minus15/B.wav` | `919d9a2e79a5bce545b2fe8a40f8b4baf33e7d671683c2f4d37e288fff12b4ef` |

`audio-fixtures.cjs` がブラウザ起動前に存在とハッシュを確認する。採用時と現仕様の尺・構成が異なる場合は比較が失敗する。このとき現仕様の合格や音の劣化を断定せず、採用条件の再確認が必要な結果として報告する。

## 検証の限界

通常テストは音符列・構造を調べるもので、聴感の合格ではない。ブラウザ音声比較も指定条件の採用音との一致だけを調べ、Firefox・Android実機・全場面の聴感は保証しない。旧外部フォルダのplayback / adjust / browser / loop / seamテストは当リポジトリに存在せず、移植済みとも実行可能とも扱わない。

調査用の `scripts/audit_*.cjs` はこの必須回帰テストとは別で、システムChromeを使用する既存前提が残る。今回の固定Chromium化の対象外。入口は [評価ツール一覧](../docs/quality-evaluation.md)。現仕様と未確認事項は [HANDOVER.md](../HANDOVER.md)。

## 採用条件の整理（2026-09-27レビュー対応）

夜空は `8eddad6` の9型拡張でseed 2026の `innerShift` が0から2に変わった。テスト側だけ0に固定すると採用時（`2c805e6`）の全音符列と一致する。現在の抽選結果は通常テストで検証し、この音声テストは過去の採用条件で合成処理を比較する。

幻想は `568d943` の4小節単位切り上げ（92→96秒）に加え、`0bd76b6` の伴奏変更がある。採用時（`3630978`）と比較し、92秒・ずらし0に固定しても内声が41音→39音で一致しない。通常入口からは外し、採用条件の再確認待ちとする。復帰には比較対象の設計と人間による採否判断が必要で、①では原本・許容差・製品の音を変えない。

変更前の最大1,375 PCM差と92秒対96秒の失敗、およびレビュー対応後の結果は [検証記録](../docs/test-results-20260927.md) を参照。

レビュー対応後：通常ブラウザ入口は2/2本PASS（再生4条件、夜空PCM差最大1・ピーク0.10271835）。幻想1本は再確認待ち・集計外。
