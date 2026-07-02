# چاکسازیی loader ـی ئینجینی دەست — v5.0.6

لە وەشانی 5.0.9، bundle ـی MediaPipe بە ناوی `vision_bundle.js` بڵاو دەکرێتەوە، نەک `.mjs`، تا Chrome ـی Android و static host ـە جیاوازەکان بە MIME ـی JavaScript ڕاست بیخوێننەوە.

WASM base URL هەروەها بەبێ trailing slash دروست دەکرێت؛ `FilesetResolver` خۆی ناوی فایل زیاد دەکات. ئەمە URL ـی دوو slash لادەبات.
