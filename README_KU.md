# AIR-DROW v7.5.4 — وەشانی پاک و جێگیری مۆبایل

ئەم وەشانە بۆ مۆبایل، Vercel و بەکارهێنانی ڕاستەقینە پاک و ڕێکخراو کراوە.

- فایلە قورسەکانی MediaPipe و مۆدێلی دەست تەنها دوای هەڵبژاردنی کامێرا بار دەبن؛ لە سەرەتای کردنەوەی ئەپ cache ناکرێن.
- `public/` لە سەرچاوە و زیپەکە لادراوە؛ Vercel خۆی لە buildدا دروستی دەکات.
- سێ patchی CSSی دواتر کۆکراونەتەوە لە `production-ui.css` بۆ ڕێکخستنی باشتر.
- هەموو دەقی feedbackی گرنگی Kurdish و English یەکسان کراون، لەوانەش پەیامی وەستانی کامێرا.
- AI بە بنەڕەت داخراوە و پێویستی بە ڕێکخستنی server هەیە؛ origin allow-list و سنووری قەبارەی داواکاری زیاد کراون.

## بۆ build
```bash
npm ci --no-audit --no-fund
npm run vercel:build
```

## بۆ Termux
فایلی [`termux/TERMUX_INSTALL.txt`](./termux/TERMUX_INSTALL.txt) بکەرەوە؛ یەک کۆدی کامل بۆ جێگۆڕکردنی پڕۆژەی کۆن و پشکنینی buildی نوێ تێدایە.
