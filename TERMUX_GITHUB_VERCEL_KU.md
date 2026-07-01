# Termux → GitHub → Vercel — v1.0.3

ئەم وەشانە بۆ کێشەی `Illegal instruction` لە `vite build` ـی Android/Termux ـە.

## GitHub

```bash
cd ~/AIR-DROW
bash scripts/github-upload-termux.sh
```

- هیچ Vite build ـێکی local ناکات.
- تەنها source syntax/preflight پشکنین دەکات.
- repo ـی `AIR-DROW` دروست/نوێ دەکاتەوە و push دەکات.

## Vercel

```bash
cd ~/AIR-DROW
bash scripts/vercel-publish-termux.sh
```

- source ـەکە دەنێرێت بۆ Vercel.
- build ـی Vite لە Vercel Linux cloud ـدا ئەنجام دەدرێت، نەک لە Termux.

بۆ API ـی دەرەکی:

```bash
VITE_API_BASE_URL="https://api.your-domain.example" bash scripts/vercel-publish-termux.sh
```

هەروەها دەتوانیت دوای GitHub push لە Vercel website ـەوە AIR-DROW import بکەیت.
