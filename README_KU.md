# AIR-DROW v7.0.0 — پشکنینی کۆتایی و Master Release

وەشانی کۆتاییی master. لە Settings → دەربارەی ئەپ پشکنینی کۆتایی زیادکرا: ڕاپۆرتێکی پاسڤ و ناوخۆیی بۆ ناسنامەی بڵاوکراوە، canvas، پاراستنی پڕۆژە و—تەنها دوای ئەوەی خۆت کامێرا بکەیتەوە—دۆخی ڕاستەقینەی کامێرا/ئینجینی دەست. خۆی کامێرا ناکاتەوە، ڕێگەپێدان داوا ناکات، ئامێر ناژمێرێت و داتا نانێرێت.

بۆ تاقیکردنەوەی مۆبایل سەیری `docs/PHASE_7_FINAL_LIVE_QA_KU.md` بکە.

# AIR-DROW v6.5.0 — وەشانی پشکنینی ئامادەیی ئامێر

ئێستا لە **ڕێکخستنەکان → دەربارەی ئەپ** پشکنینی ڕاستەقینەی ئامێر هەیە. بەبێ کردنەوەی کامێرا و بەبێ ناردنی زانیاری، دۆخی وێبگەڕ و runtime ـەکەت پیشان دەدات.

**Buildی ئێستا:** `air-drow-v650-phase6-device-readiness`


# AIR-DROW v6.4.0 — ئامادەیی بڵاوکردنەوەی کۆتایی

AIR-DROW ستودیۆیەکی کێشانە بۆ تەچ، قەڵەم، کامێرا و شوێنکەوتنی دەست. runtime ـی MediaPipe و مۆدێلی فەرمیی دەست لە هەمان سەرچاوەی local ـی ئەپەکەوە دەخوێنرێنەوە. هێڵ، ڕێکخستن، draft ـی پارێزراو و backup ـەکانت لەسەر ئامێر دەمێنن، مەگەر خۆت داوای export، share یان AI بکەیت.

## وەشانی ئێستا: قۆناغی ٥

قۆناغی پێنجەم بۆ پاکی و دڵنیایی بڵاوکردنەوەی کۆتاییە. لە Settings > دەربارەی ئەپ، وەشانی ڕاستەقینە و Build ID بەخۆکار لە runtime ـەوە دیارە. هەموو metadata ـەکان لە package، PWA، service worker، API و release files یەکسانن، و پشکنینی تایبەت build وەستێنێت ئەگەر زانیارییەکان یا UI ـی ناسنامە لەیەک جیا بن.

- **وەشان:** `6.4.0`
- **Build:** `air-drow-v640-phase5-release-readiness`
- **پشکنینی کۆتایی:** `npm run vercel:build`
- **Node.js:** `24.x`
- **یاسای runtime:** MediaPipe و مۆدێلی دەست تەنها local ـن؛ وێبگەڕ لە کاتی کارکردندا مۆدێلی دەست لە CDN دابەزێنێت نا.

## ئەوەی قۆناغەکانی ١ تا ٤ تەواویان کرد

- بنەمای production، build ـی جێگیر، Vercel و runtime ـی local.
- UI ـی premium بۆ مۆبایل، RTL/LTR، theme و ئایکۆنی local؛ FPS/Online/CAM بەبێ background.
- شوێنکەوتنی دەست، pinch ـی جێگیر، هێڵی خێراتر، بەردەوامیی کورت لە مشت و eraser ـی ورد.
- پاشەکەوتی پارێزراو، recovery، export ـی سەلامەت، update پاش save و onboarding.

## build و deploy

```bash
npm ci --no-audit --no-fund
npm run vercel:build
```

پاش build ـی سەرکەوتوو، commit و push بکە بۆ `main`. Vercel خۆکار deploy دەکات. ئەگەر دواکەوت، لە Vercel بچۆ Deployments → Create Deployment → `main` → Deploy to Production.

بۆ وردەکاریی Termux و Vercel، `docs/RELEASE_DELIVERY_KU.md` بخوێنەوە.
