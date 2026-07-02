# داواکارییەکانی asset ـە لۆکاڵەکان

AIR-DROW هەموو asset ـە گرنگەکانی خۆی بە شێوەی لۆکاڵ لە پڕۆژەکەدا هەیە.

## مۆدێلی دەست

```text
web/vendor/models/hand_landmarker.task
```

ئەم فایلە لە زیپی `v5.0.6` ـدا هەیە و قەبارەی `7820242` byte ـە. `npm run model:verify` checksum ـەکەی پشکنین دەکات.

## Runtime ـی MediaPipe

لە کاتی build، `@mediapipe/tasks-vision@0.10.35` بۆ ئەم شوێنانە کۆپی دەکرێت:

```text
public/vendor/mediapipe/vision_bundle.js
public/vendor/mediapipe/wasm/
```

## ئایکۆن و فۆنت

- Toolbar SVG: `web/assets/icons/toolbar/`
- Interface SVG: `web/assets/icons/`
- Kurdish font: `web/assets/fonts/noto-kufi-arabic/`

## یاسا

- asset ـی لۆکاڵ مەسڕەوە.
- بۆ مۆدێلی دەست هیچ لینکێکی دەرەکی زیاد مەکە.
- ئەگەر مۆدێل تێکچوو، `npm run build` بە ئەنقەست وەستێت.


## v5.0.6 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
