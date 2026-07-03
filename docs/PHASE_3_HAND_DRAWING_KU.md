# AIR-DROW v6.2.0 — قۆناغی ٣: شوێنکەوتنی دەست و کێشان

## چاکسازییە سەرەکییەکان
- stabilizer ـی velocity-aware بۆ نووکی پەنجە؛ دواخستنی کێشان کەمترە و jump ـە نائاساییەکان ڕەت دەکرێنەوە.
- smoothing ـی camera drawing دووجار بە هەمان توندی جێبەجێ ناکرێت، بۆیە هێڵەکە کەمتر دوا دەکەوێت.
- pinch تەنها لە کاتی geometry و stability ـی دروست هێڵ دەستپێدەکات.
- لە مشت، occlusion یان detector-drop ـی کورتدا current stroke تەنها دەگیرێت؛ خاڵی نوێ زیاد ناکرێت تا tracking دووبارە دروست بێت.
- guide ـی دەست بۆ 560ms دەمێنێت؛ بەڵام jump ـی گەورە هێڵەکە دەبڕێت.

## پشکنین
`npm run hand-phase3:verify`
