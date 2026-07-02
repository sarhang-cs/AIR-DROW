# AIR-DROW v5.0.9 — چارەسەری مۆدێلی دەست

ئەم وەشانە هەڵەی Android ـی `NormalizationOptions metadata` چارەسەر دەکات. هۆکارەکە مۆدێلێکی legacy بوو کە پێکهاتەی فەرمی MediaPipe Tasks نەبوو.

## بۆ deploy

```bash
npm install
npm run build
```

`npm run build` خۆکارانە مۆدێلی فەرمی Google ـی `hand_landmarker/float16/1` دادەبەزێنێت، بە SHA-256 پشکنینی دەکات، دواتر runtime ـە لۆکاڵەکان دروست دەکات و پێش deploy دڵنیایی دەکات. دوای deploy، مۆدێل و runtime ـەکە هەموویان لۆکاڵن.

**گرنگ:** فولدەری `public/` بە تەنها deploy مەکە؛ بە Vercel build ـی ناو `vercel.json` deploy بکە تا مۆدێلی ڕاست دروست بکرێت.
