#!/bin/zsh
# launchd ajanlarını kaldırır. Proje dosyalarına ve veritabanına dokunmaz.
AG="$HOME/Library/LaunchAgents"
for n in server daily; do
  L="com.artriyum.abonelik.$n"
  launchctl bootout "gui/$(id -u)/$L" 2>/dev/null && echo "durduruldu: $L"
  rm -f "$AG/$L.plist"
done
