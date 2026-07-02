# چاکسازیی build order و deploy — AIR-DROW v5.1.0

## هۆکاری ڕاستەقینە
لە deploy ـی Vercel، فۆڵدەری `public/` بە `.vercelignore` لە source upload نەدەچوو. ئەمە خودی خۆی دروستە، چونکە `public/` دەبێت لە build دروست بکرێت. بەڵام پشکنینی runtime پێش `build:static` کار دەکرد و پێش دروستبوونی `public/vendor/mediapipe/vision_bundle.js` وەستابوو.

## چارەسەر
- پشکنینەکان بۆ دوو جۆر دابەشکران: `verify:source` و `verify:deploy-output`.
- `build:static` لە نێوانیان دانرا.
- MediaPipe bundle، WASM و مۆدێلی دەست یەکەم دروست و کۆپی دەکرێن بۆ `public/vendor/`، پاشان پشکنین دەکرێن.
- `npm run build` لە clone ـی پاکی بێ `public/` تاقیکراوەتەوە.

ئەم گۆڕانکارییە تەنها کێشەی deploy/build ـی Vercel چارەسەر دەکات؛ تاقیکردنەوەی کارکردنی live ـی ئینجینی دەست لە مۆبایل هێشتا دوای deploy دەبێت بکرێت.
