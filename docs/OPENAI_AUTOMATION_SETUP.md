# SOAM Media OpenAI API 設定

記事生成は OpenAI Responses API（`POST https://api.openai.com/v1/responses`）だけを使います。Chat Completions、Claude、Anthropic、互換エンドポイントは使いません。

GitHub の `soamcreativeai/soam-creative-media` を開き、`Settings` → `Secrets and variables` → `Actions` → `New repository secret` で、引用符・前後空白なしに次を登録します。

| 名前 | 値 |
| --- | --- |
| `MEDIA_AI_BASE_URL` | `https://api.openai.com/v1` |
| `MEDIA_AI_API_KEY` | 現在利用中のOpenAI APIキー |
| `MEDIA_AI_MODEL` | `GET /v1/models` で確認済みのOpenAI model ID |

`MEDIA_AI_MODEL` は実APIで確認するまで推測で設定しません。設定後は `Generate and publish SOAM Media article` を `dry_run=true` で実行し、ジョブ内の `Verify OpenAI connectivity and configured model` が成功することを先に確認します。

生成APIは `Authorization: Bearer` と `Content-Type: application/json` を使用します。出力は厳格なJSON schemaで受け、本文HTMLはローカルのテンプレート変換でだけ作成します。429、5xx、タイムアウト、不正JSONは最大3回まで再試行し、成功しない場合は記事・一覧・サイトマップを変更しません。
