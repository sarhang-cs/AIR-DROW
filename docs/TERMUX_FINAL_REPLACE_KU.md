# جێگۆڕکردنی پارێزراوی AIR-DROW v5.0.7 لە Termux

زیپی `AIR-DROW_v5.0.7_DRAWER_RTL_RELIABILITY.zip` بخە ناو Download ـی مۆبایل. مۆدێلی دەست و MediaPipe runtime لە خۆی زیپەکەدان؛ هیچ فایلێکی دیکە زیاد مەکە.

```bash
pkg update -y && pkg install -y nodejs unzip
termux-setup-storage
cd ~/storage/downloads
rm -rf "$HOME/.airdrow-release-staging"
mkdir -p "$HOME/.airdrow-release-staging"
unzip -o AIR-DROW_v5.0.7_DRAWER_RTL_RELIABILITY.zip -d "$HOME/.airdrow-release-staging"
bash "$HOME/.airdrow-release-staging/AIR-DROW-v5.0.7-DRAWER-RTL-RELIABILITY/termux/replace-with-final-release.sh"
```

script ـەکە پێش جێگۆڕکردن مۆدێل، drawer and RTL reliability و final release پشکنین دەکات، فولدەری پێشوو backup دەکات، و ئەگەر پشکنینی کۆتایی شکستی هێنا backup دەگەڕێنێتەوە.


## v5.0.7 — Hand Runtime Loader Fix
ئەم وەشانە CPU-first local hand engine، drawer scroll ـی سەربەخۆ، toggle ـی تەواو، RTL/LTR geometry ـی جێگیر و redo SVG ـی لۆکاڵ زیاد دەکات.
