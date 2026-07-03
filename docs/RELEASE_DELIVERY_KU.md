# گەیاندنی Master Release

## ڕێکخستنی کۆتایی

- ZIP ـەکە source ـی پاکە و پڕۆژەکە لە ڕەگەوە جێگە دەگرێت؛ patch نییە.
- installer ـی Termux پڕۆژەی پێشووت backup دەکات.
- model ـی فەرمیی دەست لە ZIP ـدا نییە تا قەبارەکە کەم بێت؛ installer کۆپیی local و پشکنراوی ناو repo ـی پێشوو دەپارێزێت.
- ئەگەر build شکست بێنێت، backup خۆکارانە دەگەڕێتەوە.

## پاش deploy

لە Vercel deployment ـی `main` بکە بە Production. پاش `Ready` بوون، تاقیکردنەوەی Phase 7 لە `PHASE_7_FINAL_LIVE_QA_KU.md` جێبەجێ بکە.

## Vercel

لە Vercel: **Deployments → Create Deployment → main → Deploy to Production**.
