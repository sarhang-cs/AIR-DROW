# مۆدێلی دەستی لۆکاڵ — AIR-DROW v5.0.7

مۆدێلی دەست لە ناو زیپی پڕۆژەکەیە و هیچ download ـێکی دیکەی پێویست نییە.

## شوێنی source

```text
web/vendor/models/hand_landmarker.task
```

## شوێنی static output

```text
public/vendor/models/hand_landmarker.task
```

## پشکنین

- قەبارە: `7820242` byte
- SHA-256: `168ca8a3f698e93e2caba5c5e8234c3443e56b2ea3ebacec205e4df33bc899da`
- ناوەڕۆک: `hand_detector.tflite` و `hand_landmarks_detector.tflite`
- runtime: `@mediapipe/tasks-vision@0.10.35`

```bash
npm run model:verify
```

ئەگەر checksum یان قەبارەکە یەکسان نەبوو، build دەوەستێت. ئەمە بۆ ئەوەیە فایلێکی ناقص یان تێکچوو نەچێتە deploy.

## سیاسەتی تۆڕ

- هیچ remote model URL ـێک بەکارناهێنرێت.
- هیچ fallback ـێکی شاراوە بۆ download نییە.
- service worker مۆدێل و MediaPipe runtime ـی لۆکاڵ cache دەکات بۆ کارکردنی offline دوای یەکەم load ـی سەرکەوتوو.

مۆدێلی task bundle لە پێکهاتە local ـەکانی MediaPipe Hands دروست کراوە و وەک بەشێک لە AIR-DROW دابین کراوە.


## v5.0.7 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
