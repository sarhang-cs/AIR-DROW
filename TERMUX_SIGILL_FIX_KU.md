# Termux SIGILL / Illegal Instruction Fix

لە screenshot ـەکەتدا `npm ci` و source checks سەرکەوتوون، بەڵام لە `vite build` ـدا:

```text
Illegal instruction
```

ڕوویداوە. ئەمە لە کۆدی AirDraw نییە؛ لە native bundler ـی Vite 8 / Rolldown لە هەندێک Android arm64 + Termux ئامێرەدا ڕوو دەدات.

## Phase 1: GitHub

لە Termux:

```bash
cd ~/AIR-DROW
bash scripts/github-upload-termux.sh
```

ئەم script ـە هیچ local Vite build ناکات. تەنها source check دەکات و کۆدەکە بۆ GitHub push دەکات.

## Phase 2: Vercel

```bash
cd ~/AIR-DROW
bash scripts/vercel-publish-termux.sh
```

ئەمە source ـەکە بۆ Vercel دەنێرێت و Vercel build ـەکە لە Linux cloud environment ئەنجام دەدات.

## Alternative

دوای push بۆ GitHub، Vercel website بکەرەوە → Add New → Project → GitHub → AIR-DROW → Deploy.

## Why this is safer

Termux local build لە native Android binary ـی Rolldown دەکەوێتە SIGILL. GitHub push و Vercel cloud build پێویستیان بەو local native build ـە نییە.
