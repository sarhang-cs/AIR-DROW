# Release checklist — AIR-DROW v5.0.7

- [x] `web/vendor/models/hand_landmarker.task` لە source ـدا هەیە.
- [x] checksum ـی مۆدێل لە `scripts/verify-local-hand-model.mjs` یەکخراوە.
- [x] `npm run model:verify` تێپەڕبوو.
- [x] `npm run build` MediaPipe runtime و مۆدێل بۆ `public/vendor/` کۆپی دەکات.
- [x] service worker ڕێگای local model/runtime cache دەکات.
- [x] version و build ID لە manifest، runtime، health API و service worker یەکخراون.
- [x] هیچ remote model URL یان runtime download fallback نییە.
- [x] Termux replacement script مۆدێلی ناو زیپ پشکنین دەکات.


## v5.0.7 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
