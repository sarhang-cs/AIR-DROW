# مۆدێلی دەستی AIR-DROW — v5.2.1

لە وەشانی `v5.2.1`، پڕۆژەکە مۆدێلی legacy ـی کۆن بەکارناهێنێت. ئەو مۆدێلە بە شێوەی دەستی لە پێکهاتەکانی MediaPipe Hands کۆکرابووەوە و لە Android Chrome هەڵەی `NormalizationOptions` ـی دروست دەکرد.

## چارەسەرەکە

پێش هەر build ـێک، ئەم فرمانە بە ئۆتۆماتیکی کار دەکات:

```bash
npm run model:sync
```

فایلە فەرمییەکەی Google MediaPipe بۆ `hand_landmarker/float16/1` دابەزێنرێت، پاشان بە:

- قەبارەی پێویست: `7,819,105` bytes
- SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

پشکنین دەکرێت. ئەگەر قەبارە یان checksum جیاواز بێت، build ـەکە وەستێنرێت و هیچ مۆدێلێکی نادروست deploy ناکرێت.

## دوای build

لە کاتی بەکارهێنانی ئەپەکە، مۆدێل بە شێوەی local لەم شوێنەوە دەخوێندرێتەوە:

```text
/vendor/models/hand_landmarker.task?model=v4-fbc2a300
```

واتە تەنها کاتی build پەیوەندی ئینتەرنێت پێویستە؛ لە ناو browser ـدا مۆدێلەکە دووبارە لە دەرەوە دابەزێنرێت.

## بۆ Vercel

Deploy ـی ئاسایی بە `npm run build` بکە. `--prebuilt` یان deploy ـکردنی تەنها ناوەڕۆکی `public/` بەکارمەهێنە، چونکە `public/vendor/models/hand_landmarker.task` تەنها لە build ـدا دروست دەکرێت.


## v5.2.1 status overlay note
FPS, Online and CAM are source-defined transparent text overlays with no background panel.
