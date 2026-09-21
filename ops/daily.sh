#!/bin/zsh
# Günlük görev: kur çek → hatırlatmaları çalıştır → yedek al.
# launchd her sabah 09:00'da çağırır. Masaüstü gizlilik koruması nedeniyle
# bu betik ~/Library/Application Support/abonelik/ altında durur; proje yolu sabittir.
set -u
# Proje kökü: ABONELIK_HOME tanımlıysa onu, değilse betiğin bulunduğu yeri kullan.
PROJ="${ABONELIK_HOME:-$(cd "$(dirname "$0")/.." && pwd)}"
LOG="$PROJ/logs/daily.log"
mkdir -p "$PROJ/backups" "$PROJ/logs"
ts() { date "+%Y-%m-%d %H:%M:%S"; }
fail=0

if [ ! -r "$PROJ/.env" ]; then
  echo "[$(ts)] HATA: .env okunamıyor — launchd'ye Tam Disk Erişimi verilmemiş olabilir" >> "$LOG"
  exit 1
fi
set -a; source "$PROJ/.env"; set +a
PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"

echo "[$(ts)] başladı" >> "$LOG"
for i in {1..15}; do curl -sS -m 2 -o /dev/null "$BASE/login" && break; sleep 2; done

# 1. TCMB kuru — HTTP kodunu da yaz, sessiz 401'i yakala
FX=$(curl -sS -m 20 -w '\n[http %{http_code}]' -X POST "$BASE/api/cron/fx" -H "x-cron-secret: $CRON_SECRET" 2>&1 | tr '\n' ' ')
echo "[$(ts)] kur: $FX" >> "$LOG"
[[ "$FX" == *"[http 200]"* ]] || fail=1

# 2. Hatırlatmalar
REM=$(curl -sS -m 20 -w '\n[http %{http_code}]' -X POST "$BASE/api/cron/reminders" -H "x-cron-secret: $CRON_SECRET" 2>&1 | tr '\n' ' ')
echo "[$(ts)] hatırlatma: $REM" >> "$LOG"
[[ "$REM" == *"[http 200]"* ]] || fail=1

COUNT=$(echo "$REM" | sed 's/\[http.*//' | /usr/bin/python3 -c 'import sys,json
try: print(len(json.load(sys.stdin).get("sent",[])))
except Exception: print(0)')
if [ "$COUNT" -gt 0 ]; then
  NAMES=$(echo "$REM" | sed 's/\[http.*//' | /usr/bin/python3 -c 'import sys,json
d=json.load(sys.stdin); print(", ".join(f"{s[\"service\"]} ({s[\"daysBefore\"]} gun)" for s in d["sent"]))')
  /usr/bin/osascript -e "display notification \"$NAMES\" with title \"Abonelik yenileniyor\" subtitle \"$COUNT kayit\" sound name \"Glass\""
fi

# 3. Yedek
DEST="$PROJ/backups/app-$(date +%F).db"
if /usr/bin/sqlite3 "$PROJ/data/app.db" ".backup '$DEST'" 2>>"$LOG"; then
  echo "[$(ts)] yedek: $DEST ($(stat -f%z "$DEST") bayt)" >> "$LOG"
  find "$PROJ/backups" -name 'app-*.db' -mtime +30 -delete
else
  echo "[$(ts)] HATA: yedek alınamadı" >> "$LOG"; fail=1
fi

echo "[$(ts)] bitti (fail=$fail)" >> "$LOG"
exit $fail
