#!/bin/zsh
# launchd ajanlarını kurar: sunucu (her zaman açık) + günlük görev (09:00).
# Şablonlardaki yollar bu makineye göre doldurulur.
set -e
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(dirname "$(which node)")"
AG="$HOME/Library/LaunchAgents"
mkdir -p "$AG"

for n in server daily; do
  L="com.artriyum.abonelik.$n"
  sed -e "s|__PROJECT_DIR__|$PROJ|g" -e "s|__NODE_BIN__|$NODE_BIN|g" \
    "$PROJ/ops/$L.plist.template" > "$AG/$L.plist"
  plutil -lint "$AG/$L.plist" >/dev/null
  launchctl bootout "gui/$(id -u)/$L" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$AG/$L.plist"
  echo "kuruldu: $L"
done

echo "Sunucu: http://localhost:3000  — günlük görev her sabah 09:00"
