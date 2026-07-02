# ڕێکخستنی کۆدی AIR-DROW v5.0.9

ئەم پڕۆژەیە بە شێوەی module ـی ڕوون ڕێکخراوە. هیچ feature ـێک نابێت بە patch ی شاراوە یان کۆدی دۆباری زیاد بکرێت؛ هەر گۆڕانکارییەک دەبێت لە شوێنی سروشتی خۆی بکرێت.

```text
web/
  index.html                 شێوەی بنەڕەتی UI و semantic hooks
  assets/
    css/                     design system و interface styles
    icons/                   هەموو local SVG assets
    js/
      config/                release metadata، defaults و appearance mapping
      core/                  storage، backup، update، loading و reliability
      features/              hand tracking، export، shapes، AI و creator tools
      i18n/                  هەموو دەق و accessibility strings
      ui/                    DOM registry
  vendor/                    self-hosted MediaPipe output/model input
  sw.js                      PWA cache و update lifecycle
  release.json               public release metadata
api/
  ai/                        server-only AI endpoint
  health.js                  health/version response
scripts/
  verify-*.mjs               source and release contract checks
  build-selfhosted-mediapipe.mjs
termux/
  replace-with-final-release.sh
  verify-final-release.sh
docs/
  deployment، release checklist، asset contract، architecture
```

## بنەماکان

1. **UI copy:** هەموو دەقە دیارەکان تەنها لە `web/assets/js/i18n/translations.js`.
2. **Icons:** هەموو ئایکۆنەکان local SVG ـن. Toolbar ـەکان لە `assets/icons/toolbar/` بە شێوەی editable دەمێنن.
3. **Release metadata:** version و buildId دەبێت لە package، runtime، release.json، manifest، service worker، health API و asset manifest یەکسان بن.
4. **Camera assets:** مۆدێل و MediaPipe bundle تەنها local/self-hosted ـن.
5. **No hidden patches:** feature ـی نوێ دەبێت module و verification ـی خۆی هەبێت؛ کۆدی سەرەتایی `app.js` تەنها orchestration ـە.


## v5.0.9 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
