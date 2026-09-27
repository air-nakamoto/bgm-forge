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

hostingテストは `.cloudflare-public/` を使用しない。`build_hosting.py --output <新規パス>` は既存パスを拒否する。引数なしの公開ビルドは従来どおり `.cloudflare-public/` を再生成する。

## ブラウザテスト（別入口）

開発用依存だけを `package-lock.json` に固定する。製品のHTML・配布ファイルには追加しない。

```sh
npm ci
npm run test:browser:install
npm run test:browser
```

Playwright 1.63.0と、それに対応するChromium（revision 1243）を使う。システムのChromeや `NODE_PATH` に依存しない。初回セットアップにはネット接続が必要。Linuxで共有ライブラリが不足する場合は `npx playwright install --with-deps chromium` でOS依存も準備する。

全入口は下記3本を最後まで実行し、1本でも失敗すれば終了コード1。依存不足・WAV不足も失敗であり、黙ってスキップしない。

| テスト | 前提と検査範囲 |
|---|---|
| playback-clock | 採用WAV不要。分割／単体版×通常／動きを減らす設定の4条件。位置・シーク・ループ・一時停止／再開・停止・実尺表示 |
| balance-audio | 下記の夜空の採用WAVが必要。seed 2026・76 BPM・musicbox・30秒・旋律sparse。16bit PCM差最大1以下・ピーク0.95以下 |
| wonder-pad-audio | 下記の幻想の採用WAVが必要。seed 2026・60 BPM・glass・90秒・旋律なし。16bit PCM差最大1以下・ピーク0.95以下 |

個別の入口：

```sh
npm run test:browser:playback
npm run test:browser:audio
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

調査用の `scripts/audit_*.cjs` はこの必須回帰テストとは別。入口は [評価ツール一覧](../docs/quality-evaluation.md)。現仕様と未確認事項は [HANDOVER.md](../HANDOVER.md)。

## 2026-09-27の検証結果

通常テストは全PASS。ブラウザは再生4条件がPASSし、採用WAV比較2本は失敗した。夜空は最大1,375 PCM単位の差、幻想は採用WAV92秒に対して現仕様96秒。入口全体は終了コード1を返す。原本の差し替え・許容差の拡大・音声処理の変更は行っていない。詳しい環境と切り分けは [検証記録](../docs/test-results-20260927.md) を参照。
