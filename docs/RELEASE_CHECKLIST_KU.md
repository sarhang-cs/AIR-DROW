# Release checklist — AIR-DROW v5.2.3

## پێش deploy

- [x] source ZIP ـەکە هیچ legacy hand-model ـێکی کۆنی تێدا نییە.
- [x] `scripts/sync-official-hand-model.mjs` URL، قەبارە و SHA-256 ـی مۆدێلی فەرمی پشکنین دەکات.
- [x] runtime بە `/vendor/models/hand_landmarker.task?model=v5-fbc2a300` ڕێکخراوە بۆ بەتاڵکردنەوەی cache ـی کۆن.
- [x] service worker URL ـی نوێی مۆدێل و runtime ـە لۆکاڵەکان cache دەکات.
- [x] version و build ID لە manifest، runtime، health API و service worker یەکخراون.
- [x] هیچ remote model URL یان runtime download fallback نییە.

## لە کاتی build/deploy

- [ ] `npm run build` بە سەرکەوتوویی تەواو بێت.
- [ ] `npm run model:verify` checksum ـی مۆدێلی دابەزێنراو پشتڕاست بکاتەوە.
- [ ] `public/vendor/models/hand_landmarker.task` دوای build هەبێت.
- [ ] deploy بە `npm run build` بکرێت، نەک `--prebuilt` یان public folder ـی بە تەنها.

## دوای deploy

- [ ] پەڕەکە refresh بکە و پەیامی update ـی PWA قبوڵ بکە، یان Chrome بکەوە و دووبارە بیکەرەوە.
- [ ] Camera/Hand mode لە Android Chrome تاقی بکەرەوە و دڵنیابەوە پەیامی `Hand runtime is unavailable` نەماوە.


## v5.2.3 status overlay note
FPS, Online and CAM are source-defined transparent text overlays with no background panel.
