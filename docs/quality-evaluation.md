# 評価ツールの入口

更新: 2026-09-25

## 配置と役割

| ファイル | 役割 / 制約 |
|---|---|
| `tests/scene-variation.cjs` | 譜面・新規/編集長尺・配布整合性。音の良さの採点ではない |
| `tests/feedback.cjs`, `tests/hosting.cjs` | ローカルの送信処理・公開設定検査。上記から呼ばれる |
| `scripts/audit_audio.cjs` | 譜面と実音声の監査。音声にはPlaywrightとChromeが必要 |
| `scripts/check_audit_result.cjs` | 件数・数値・ソース一致の確認。プロセス終了コードは別途取得 |
| `scripts/report_audio_audit.cjs` | 完了結果を確認し、WAV構造検証・ローカル試聴ページ・記録CSVを生成 |
| `scripts/audit_sections.cjs` | 現行ソースと一致する保存音声の譜面を再現し、最大4小節・16秒以内の休止と再発音を検証。原PCMから区間抜粋を作成 |
| `tests/balance-audio.cjs`, `tests/wonder-pad-audio.cjs` | 採用音源との比較。ローカルfixtureが必要。欠損をPASSにしない |
| `scripts/audit_balance.cjs` | 実験用ステムA/B作成。製品出力の合格テストと区別 |
| `work/quality-audit-*` | 測定JSON。ローカル証跡として保存、Git・公開物から除外 |

参照資料と再現手順を維持するため、既存スクリプトのパスは変更しない。

- [機械検査チェックリスト](quality-checklist.md)
- [人間による品質確認](human-listening-checklist.md)
- [実施スケジュール](quality-verification-schedule.md)
- [外部ツールとライセンス台帳](evaluation-tool-licenses.md)

## 実行例（リポジトリ直下）

```sh
node tests/scene-variation.cjs
BGM_SCORE_ONLY=1 node scripts/audit_audio.cjs work/quality-audit-new-score
BGM_AUDIT_FILTER=wonder node scripts/audit_audio.cjs work/quality-audit-new-wonder
node scripts/check_audit_result.cjs work/quality-audit-new-wonder
```

代表45件と試聴ページ（外部通信なし）:

```sh
BGM_AUDIT_PROFILE=representative node scripts/audit_audio.cjs work/quality-audit-new-representative
node scripts/report_audio_audit.cjs work/quality-audit-new-representative
```

区間確認を追加する場合は、同じ出力先で `node scripts/audit_sections.cjs <出力先>` を実行後、レポート生成を再実行する。既存の試聴記録CSVは保持する。
45件の内声休止、90/120秒30件の休止後の再発音を確認済み。疑惑90/120秒の6件は自動伴奏が別経路で、場面専用の別型制御は適用されない。再発音確認を別型・聴感合格と混同しない。

新規実行ではcompletion.jsonも確認する。試聴ページはseed 2026の15曲。残り30曲は数値測定のみ。

Playwrightが解決できるNode環境を使う。必要なら `NODE_PATH` に既存node_modules、`BGM_CHROME` にChrome実行ファイルを設定。個人の絶対パスは埋め込まない。今回、同梱ランタイムのPlaywrightが利用できたので新規インストールはしていない。

`BGM_AUDIT_FILTER` はケースJSONへの部分文字列一致。現行の `wonder` は23件、`long` は24件。引用符を誤ってエスケープすると0件になるため `meta.json.cases > 0` を確認する。
毎回新しい出力先を使い、複数プロセスで共有しない。セッションIDを保持して終了コードを取得する。音声JSONには途中経過も保存される。

## 2026-09-25の訂正・確認状況

- 「composeの第3引数が無視される」という以前のレビューは誤り。テスト用ラッパーはextraを受け取る。修正不要。
- commit `363097812906121adbf1d1bdace25f07a8a4af1d` で回帰テストを終了コード0まで再実行。短尺1,632、長尺6,912、新規作曲7,200、場面816ケースのPASS表示を確認。
- 譜面監査JSONは17,280件、errors空。
- 幻想音声JSONは23/23件、既存異常判定に該当なし。前の「4件で終了」は途中結果を終了と誤認した報告。
- 長尺音声JSONは整理開始時20/24件でプロセス稼働中。前の「開始前に終了」を撤回。最新件数は確認コマンドを使う。
- 整理後の確認スクリプト実行時には長尺24/24件を取得。幻想23/23件とともに数値異常なし・現行ソースhash一致。0件の誤フィルター結果はINCOMPLETE（終了コード2）と判定した。
- 過去の音声プロセス終了コードは未取得。JSON全件取得と正常終了は別に記録する。
- 人間試聴は未実施。自動測定だけでクリック不在・自然さ・場面らしさを保証しない。

## 指標の運用

音域外・非有限値・生成失敗は不具合。音高エントロピー・反復率・密度・RMS・スペクトル・FAD等は診断値として扱い、万能な合格閾値を設定しない。
追加指標は出典と定義を確認し、試聴採用曲との比較から場面別基準を作る。現時点では外部評価ライブラリ・モデルを本プロジェクトに導入していない。
