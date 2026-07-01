# Upload / Deploy Guide — AirDraw Production Release

## پێش هەر شتێک

ئەم ZIP ـە **کۆدی سەرچاوە + ڕێکخستنی production + server** ـی تەواوە.  
بۆ web hosting ـی static پێویستە سەرەتا Vite build بکرێت تا `web/dist/` دروست بێت.

## ڕێگای 1 — GitHub / Netlify / Vercel

1. ZIP ـەکە unzip بکە.
2. هەموو ناوەڕۆکی root ـەکە بخە ناو GitHub repository.
3. بۆ Netlify:
   - `netlify.toml` خۆکار build/publish ڕێکدەخات.
4. بۆ Vercel:
   - `vercel.json` ڕێکخراوە.
5. لە environment variables:
   - `VITE_API_BASE_URL=https://api.your-domain.example`
6. بۆ frontend ـی تەنها local/offline، API variable بەتاڵ بهێڵە.

## ڕێگای 2 — Termux / Android

```bash
unzip AirDraw_Production_Release_v1.0.0.zip
cd AirDraw_Production_Release_v1.0.0
bash scripts/termux-setup.sh
bash scripts/build-production.sh
```

پاشان `web/dist/` ـەکە دەتوانیت بۆ Netlify، Vercel، Cloudflare Pages یان hosting ـی static upload بکەیت.

## ڕێگای 3 — Docker

```bash
cp server/.env.example server/.env
# دەستکاری AIRDRAW_API_TOKEN و AIRDRAW_ALLOWED_ORIGINS بکە
docker compose up --build
```

- Frontend: `http://localhost:8080`
- API: `http://localhost:8787/api/health`

## Server security

بۆ public deployment:
- HTTPS بۆ frontend
- WSS بۆ WebSocket
- `AIRDRAW_API_TOKEN` یان login/session ـی ڕاستەقینە
- `AIRDRAW_ALLOWED_ORIGINS` تەنها بۆ دۆمەینەکانی خۆت
- backup بۆ `server/data/` یان گۆڕینی SQLite بۆ managed database
- reverse proxy / Nginx بۆ TLS

## Direct upload note

ئەگەر hosting ـەکەت build command پشتیگیری ناکات، تەنها `web/dist/` upload بکە.  
ئەگەر dist دروست نەبێت، source folder ـی `web/` بەخۆی static site ـی ئامادە نییە چونکە Vite bundling و `lottie-web` پێویستە.


## GitHub + Vercel ready

Use `TERMUX_GITHUB_VERCEL_KU.md` for the exact Termux flow. Vercel builds `web/` and publishes `web/dist`; `server/` is intentionally excluded from Vercel static deployment.
