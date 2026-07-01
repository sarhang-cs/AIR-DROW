# AirDraw Production Release v1.0.0 — Motion Skin, Lottie & UI/UX

**Developer:** SARHANG IO  
**Version:** 23.0.0

## ڕوکار و Motion Skin

### Lottie JSON
- `web/public/assets/airdraw-logo-lottie.json` فایلی Lottie ـی ڕاستەقینەیە.
- `lottie-web` لە Vite app ـەکەدا بار دەکرێت، و logo ـەکە بە SVG renderer کاردەکات.
- ئەگەر Lottie JSON یان JavaScript بار نەبوو، `AD` fallback نیشان دەدرێت.

### Dynamic logo / icon / animation
- Dynamic Logo: چالاک/ناچالاککردنی animation ـی logo.
- Dynamic Tab Icons: icon ـی tab ـی active بە animation دەجوڵێت؛ کاتێک tab ـەکە ناچالاک دەبێت بە transition بۆ دۆخی ئاسایی دەگەڕێتەوە.
- Button micro-interactions: hover, press و shine effect ـی button ـە سەرەکییەکان.
- Reduced Motion: ئەگەر سیستەم `prefers-reduced-motion` داوا بکات، animation ـەکان بە ناچار کەم دەکرێنەوە.

### Complete Skin
لە Style Studio:
- Aurora Glass
- Berry Candy
- Midnight Ink

Property ـەکان:
- Glass blur
- Card radius
- Motion intensity
- Lottie logo toggle
- Dynamic icon toggle
- Glass toggle
- Button interaction toggle

هەموو ئەم property ـانە لە IndexedDB ـی هەمان browser پاشەکەوت دەکرێن. Project drawing data جیاوازە و ناگۆڕدرێت.

## UI / UX
- container ـی responsive و adaptive بۆ mobile، tablet و desktop.
- glass card تەنها لە شوێنە گرنگەکان بەکار هاتووە.
- Backdrop blur لە شاشە یان browser ـی ناپشتگیریکراو بە background ـی solid fallback دەگۆڕدرێت.
- sheet / modal / toast / tab layer ـەکان z-index ـی جیاوازیان هەیە.
- tab navigation بۆ Studio، Style، Data و API.
- بۆ destructive action ـەکان Phase 22 confirm/cancel پارێزراوە.

## Run

```bash
cd web
npm install
npm run dev -- --host 0.0.0.0
```

بۆ build:

```bash
npm run build
```

## Important truth
- Lottie logo و CSS animation بەڕاستی کاردەکەن کاتێک Vite dependencies دامەزرابن.
- API/server/data-vault/touch/hand module ـەکانی Phase 22 لە پڕۆژەکەدا پارێزراون.
- dynamic UI settings local ـن؛ بۆ skin sync ـی نێوان device ـەکان پێویستە لە داهاتوو لە API ـەوە settings object sync بکرێت.
