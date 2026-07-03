# ڕێنمایی گەیاندنی AIR-DROW بۆ GitHub و Vercel

## ١) پێش push

لە ناو repo ـەکەدا `npm ci --no-audit --no-fund` و پاشان `npm run vercel:build` جێبەجێ بکە. ئەگەر build تەواو بوو، کۆدەکە دەتوانێت push بکرێت.

## ٢) مۆدێلی دەست

فایلی `web/vendor/models/hand_landmarker.task` مۆدێلی فەرمییە و لە ZIP ـی source ـدا بۆ کەمکردنەوەی قەبارە نابێت. لە کاتی جێگۆڕکێ، script ـی Termux ئەو فایلەی پشکنراو لە وەشانی پێشووتر دەپارێزێت. ئەگەر نەبوو، `npm run model:ensure` تەنها لە کاتی build مۆدێلەکە دایدەبەزێنێت و SHA-256 پشکنین دەکات.

## ٣) Vercel

پاش push، GitHub integration دەبێت deployment دروست بکات. ئەگەر webhook کاتێک دواکەوت، لە Vercel بچۆ: Deployments → Create Deployment → `main` → Deploy to Production.

## ٤) پشکنینی دوای Ready

- Status = Ready / Production Current
- Settings > دەربارەی ئەپ = وەشان و Build ID ـی نوێ
- کامێرا و pinch تەنها لە مۆبایلی ڕاستەقینە تاقی بکەرەوە
- export ـی PNG/SVG تاقی بکەرەوە

لە کاتی هەڵەی build، script ـی جێگۆڕکێ پڕۆژەی پێشووتر دەگەڕێنێتەوە و هیچ push ـێک ناکات.
