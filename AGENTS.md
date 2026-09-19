# AGENTS.md — BGM Forge の開発ルール

このファイルは、AIが作業を始める前に読む決まりごとです。人間向けの経緯と計測値は `HANDOVER.md` にあります。
迷ったら `HANDOVER.md` を先に読んでください。

BGM Forge は、TRPGの場面に合うループBGMをブラウザだけで自動作曲するツールです。
ネット接続・アカウント・外部APIは使いません。既定は「伴奏だけ・ループ用・合成音源」。

---

## 0. 着手前に必ず

```sh
node tests/scene-variation.cjs      # 646ケース。PASSを確認してから触る
```

PASSしない状態で作業を始めないでください。先に原因を報告すること。

---

## 1. 開発のループ

このプロジェクトで効果があったのは、**感想を数字に変えてから直す**という手順です。必ずこの順で回してください。

1. **測る** — 「〜っぽい」「うるさい」「気になる」という指摘を、楽譜の統計か音声の数値に翻訳する
2. **直す** — 最小の変更で
3. **測り直す** — 同じ指標で、改善したことを数字で示す
4. **テストに固定する** — 同じ退行が起きないアサートを `tests/scene-variation.cjs` に足す
5. **記録する** — 変更内容と計測値を `HANDOVER.md` の §3 に追記する

**「たぶん良くなった」で終わらせないこと。** 過去に、内声を絶対音域で固定したら80–250Hz帯がかえって増えた
（41.8%→51.7%）ことが計測で分かって方針を変えた、という失敗をしています。

### 測り方

楽譜の統計は Node から直接取れます。`bgm-score.js` は純粋関数だけで音を出しません。

```js
const fs=require('fs'),vm=require('vm'),path=require('path');
const score=require('./bgm-score.js');
const ctx={window:{BGM_TEST:{}},BGMScore:score};
vm.runInNewContext(fs.readFileSync('bgm-forge.js','utf8'),ctx);
const {MOODS,MODES,DEFAULTS}=ctx.window.BGM_TEST;   // UIを初期化せずAPIだけ生える
const m=MOODS.find(x=>x.id==='calm'),d=DEFAULTS.calm;
const s=score.compose({mood:m,scale:MODES[m.mode],bpm:d[0],sound:d[1],length:30,ending:'loop',lead:false},2026);
console.log(score.events(s).length);
```

音そのもの（音量の波、ループの継ぎ目、スペクトル）は実際にレンダリングしないと測れません。
ブラウザで `window.BGM_TEST={}` を定義してから `bgm-forge.js` を評価すると `BGM_TEST.render(score)` が使えます。
定数を変えた版を何通りも比べたいときは、ソースの**文字列を書き換えてから** `new Function()` で評価すると速い。
1曲のレンダリングに数十秒かかるので、結果を溜めてからまとめて取り出すこと。

画面を変えたときは、ヘッドレスChromiumでスクリーンショットを撮って目で見てください。
**820px と 390px の2幅**で見ると、折り返しの事故に気づけます。

### 聴くのは人間の仕事

音が良いかどうかはAIには判定できません。計測で示せるのは「谷が浅くなった」までです。
最後は必ず「鳴らして確かめてください」と伝えること。**聴かずに「良くなりました」と書かないこと。**

---

## 2. 触ってよいもの・いけないもの

| ファイル | 扱い |
|---|---|
| `bgm-score.js` | 作曲の中核。純粋関数のみ。**音を出す処理を入れない** |
| `bgm-forge.js` | 音声合成・再生・保存・UI配線 |
| `bgm_forge_v2.html` | 画面とCSS。UI要素のidはここが正 |
| `bgm_forge_standalone.html` | **生成物。直接編集しない** |
| `samples/` `vendor/` | 音源とMP3エンコーダ。ライセンス表記を消さない |

`bgm_forge_standalone.html` を直接編集すると分割ソースと乖離します。実際に2026-09-16まで乖離していました。

---

## 3. 変更のたびに必ず

1. `bgm_forge_v2.html` の `<script src="...?v=YYYYMMDD-名前">` の**版を上げる**
   （上げないとブラウザが古いJSを使い続け、修正が反映されません）
2. `python3 scripts/build_standalone.py` で単体版を作り直す
3. `node tests/scene-variation.cjs` を回す
4. `HANDOVER.md` の §3 に計測値つきで追記する

---

## 4. Git

- **mainに直接コミットする。プルリクエストを作らない。**
  短時間にPRの作成とマージを繰り返した結果、GitHubの自動検知にbot活動と判定され、アカウントが停止された実績があります。
- コミットメッセージは**日本語**。「何をしたか」を1行目に、理由と計測値を本文に。
- `git push --force`、`rebase`、`commit --amend` したあとのpushは使わない。
- 取り消しは、push前なら `git reset --soft HEAD~1`、push済みなら `git revert`。
- コミットしていない編集が消える操作（`reset --hard` など）は、実行前に日本語で確認を取る。
- 公開はリポジトリ直下の `公開する.command` をダブルクリック。未公開のコミットを表示してから `git push` します。
  環境によっては push を代行できないので、その場合はこれを案内すること。
- Cowork経由で触ると `.git/index.lock` などが消せずに残ります。`.git/_stale_locks/` へ退避してください。

---

## 5. 踏んだ落とし穴（同じ轍を踏まないこと）

- **既定のテンポは必ず `TEMPOS` にある値から選ぶ。** のどかを92拍にしたとき、一覧にない値だったため
  選択欄に名前のない「92 BPM」が1つだけ紛れ込みました。
- **HTMLに書いたボタンの文言を、JSが起動時に上書きしている箇所がある。** 試聴ボタンがそうでした。
  文言を直すときは両方を探すこと。
- **同梱サンプルのファイル名のオクターブ表記は、実音と1つずれることがある。** 音高は波形から
  基本周波数を測って決めてください（`manifest.json` にMIDI音高を明示する運用）。
- **サンプルの原音は極端に小さいことがある。** フルートは原本のピークが0.05〜0.21で、
  ピーク調整をしないとほぼ聞こえませんでした。
- **iPhoneで音が出ない場合、まず本体のサイレントスイッチを疑う。** Web Audioは着信スイッチで無音になり、
  画面上はメーターも動くので壊れて見えます。アプリ側では検知できません。
- **`autoPattern` を持つ場面では `SCENES` の一部の設定が効かなくなる。** 効くのは `harmony` と `high` だけです。
- **伴奏の音量に手を入れるときは、発音の3経路すべてに掛ける。** `synthNote` / `sampleNote` / `chipTone`。
  片方だけだと音色を切り替えたときにバランスが変わります。

---

## 6. ライセンス（勝手に変えないこと）

| 対象 | ライセンス | 置き場 |
|---|---|---|
| ソースコード | MIT（Copyright (c) 2026 air-nakamoto） | `LICENSE` |
| **このツールで作った曲** | **CC0 1.0 相当・完全に自由** | `README.md` と画面の「テイクと保存」 |
| 同梱音源 VSCO 2 CE | CC0 1.0 | `samples/vsco2/LICENSE` |
| lamejs / LAME | LGPL 2.1（未改変・原本同梱） | `vendor/lamejs/` |
| Groove MIDI Dataset | CC BY 4.0（統計のみ参照。データは非収録） | 画面のクレジット |

- 生成物がCC0と言い切れるのは、**同梱音源がCC0だから**です。CC0でない音源を足すと前提が崩れます。
  音源を追加するときは必ずライセンスを確認し、CC0以外なら生成物の表示から見直すこと。
- LGPLは全文の同梱が必要です。`scripts/build_standalone.py` のクレジット埋め込みを消さないこと。
- Groove MIDI のクレジットは画面から消さないこと。

---

## 7. やらないと決めたこと

- DAW相当の編集、MIDI入力、歌声生成
- 外部API・学習モデルの利用（ブラウザ単体で完結させる方針）
- プルリクエスト（§4）

---

## 8. 引き継ぎの一言

> `work/bgm-forge` のBGM Forgeを続けたい。`AGENTS.md` に開発ルール、`HANDOVER.md` に経緯と今後の案がある。
> 作業前に `node tests/scene-variation.cjs` を回して現状を確認してほしい。
> 直すのは分割ソースで、最後に `scripts/build_standalone.py` で単体版を作り直し、`?v=` の版も上げること。
> コミットは日本語でmainに直接、PRは作らないで。
> 「〜っぽい」という指摘をしたら、まず計測してから直す進め方でお願いします。
