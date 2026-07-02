# داواکارییەکانی asset ـە لۆکاڵەکان

AIR-DROW لە کاتی بەکارهێنانی ئەپەکەدا هەموو asset ـە گرنگەکانی خۆی بە شێوەی لۆکاڵ لە deploy ـەکەدا هەیە.

## مۆدێلی دەست

لە source ZIP ـەکەدا، فایلی خۆیی مۆدێل بە ئەنقەست نییە. لە سەرەتای build ـدا `npm run model:sync` مۆدێلی فەرمی دابەزێنێت و checksum ـی پشکنین دەکات:

```text
web/vendor/models/hand_landmarker.task
```

قەبارەی پەسەندکراو: `7,819,105` byte  
SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

`npm run model:verify` تەنها **دوای** `npm run model:sync` یان `npm run build` دەبێت بەکاربهێنرێت.

## Runtime ـی MediaPipe

لە کاتی build، `@mediapipe/tasks-vision@0.10.35` بۆ ئەم شوێنانە کۆپی دەکرێت:

```text
public/vendor/mediapipe/vision_bundle.js
public/vendor/mediapipe/wasm/
public/vendor/models/hand_landmarker.task
```

## ئایکۆن و فۆنت

- Toolbar SVG: `web/assets/icons/toolbar/`
- Interface SVG: `web/assets/icons/`
- Kurdish font: `web/assets/fonts/noto-kufi-arabic/`

## یاسا

- لە deploy ـی تەواودا asset ـە لۆکاڵەکان مەسڕەوە.
- بۆ runtime ـی browser هیچ remote model URL یان fallback ـێکی دەرەکی زیاد مەکە.
- تەنها `model:sync` لە کاتی build ـدا ڕێگەیە بۆ دابەزاندنی سەرچاوەی فەرمی.
- ئەگەر مۆدێل تێکچوو یان تۆڕ لە کاتی build نەبێت، `npm run build` بە ئەنقەست وەستێت.

## v5.2.3 — Official Hand Model Integrity Fix

ئەم وەشانە مۆدێلی legacy ـی نادروست لادەبات، مۆدێلی فەرمییەکە بە checksum پشکنین دەکات، و بە URL ـی cache-busted لە runtime ـدا لۆکاڵ بەکاردێت.


## v5.2.3 status overlay note
FPS, Online and CAM are source-defined transparent text overlays with no background panel.
