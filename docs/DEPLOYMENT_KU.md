# ڕێنمایی build و deploy ـی AIR-DROW v5.1.1

لە Vercel، `buildCommand` بریتییە لە `npm run build` و `outputDirectory` بریتییە لە `public`.

لە سەرەتای build، `npm run model:sync` مۆدێلی فەرمی Google MediaPipe ـی `hand_landmarker/float16/1` دادەبەزێنێت و بە SHA-256 پشکنینی دەکات. ئەگەر تۆڕ لە build ـدا نەبێت، build بە ئەنقەست دەوەستێت تا مۆدێلی ناقص deploy نەکرێت.

دوای build، مۆدێلەکە لە `public/vendor/models/hand_landmarker.task` ـە و کاتی بەکارهێنانی ئەپەکە هیچ download ـێکی دیکەی پێویست نییە.

## v5.1.1 — Vercel build fix
لە `package.json` ـدا `engines` دیاری نەکراوە، بۆیە Vercel هەمان Node runtime ـی خۆی بەکار دەهێنێت و ئاگادارییەتی auto-upgrade ـی `engines` دەرناکەوێت. build ـەکە تەنها ئەو پشکنینانە دەکات کە پێویستن بۆ کارکردنی ئەپ؛ پشکنینی ناوخۆی cache-header چیتر ناتوانێت deploy ڕابگرێت.
