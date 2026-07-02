# ڕێنمایی build و deploy ـی AIR-DROW v5.0.6

## پێش deploy

```bash
npm install
npm run model:verify
npm run build
```

ئەنجامی deploy لە `public/` ـە. مۆدێلی دەست و MediaPipe runtime ـەکە بە شێوەی خۆکار لە ناو `public/vendor/` دانراون.

## پشکنینی پێش upload

```bash
node scripts/verify-final-release.mjs
```

پشکنینەکە وەشان، build ID، docs، model checksum و asset contract ـەکە یەکخراو دەکات.

## تێبینی

بۆ کامێرا HTTPS یان localhost پێویستە. مۆدێلی دەست لە package ـەکەدا هەیە؛ هیچ download ـێکی زیادە مەکە.


## v5.0.6 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
