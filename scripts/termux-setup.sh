#!/data/data/com.termux/files/usr/bin/bash
set -eu

pkg update -y
pkg install -y nodejs-lts python git
python -m pip install --upgrade pip
echo "Termux tools installed. Next: cd web && npm install && npm run build"
