# ちえの もり ── 公開前の検査をまとめて回す（CCが使う。しげ用の台本は push.zsh）
#   1 組み立て  2 古い書き方  3 字の在庫  4 ホーム画面の絵  5 自己点検（本物のブラウザで src/app.js を実行）  6 iPad よこおきの 1がめん
# 終了コード 0=全部PASS / 1=どれか不合格
ROOT="/Users/shigemurasatoshi/dev/chie-no-mori"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
LOG="$ROOT/logs/check_$(date +%Y%m%d_%H%M%S).log"
FAILFILE="$ROOT/logs/.check_fail"
mkdir -p "$ROOT/logs"
rm -f "$FAILFILE"
{
print "== 1/6 組み立て =="
/usr/bin/python3 "$ROOT/tools/build_app.py" || touch "$FAILFILE"
print "== 2/6 古い書き方だけか（src/app.js・src/ui.js・index.html） =="
/usr/bin/python3 "$ROOT/tools/check_es5.py" "$ROOT/src/app.js" "$ROOT/src/ui.js" "$ROOT/index.html" || touch "$FAILFILE"
print "== 3/6 字の在庫（絵文字なし） =="
/usr/bin/python3 "$ROOT/tools/check_chars.py" "$ROOT/index.html" "$ROOT/README.md" || touch "$FAILFILE"
print "== 3b/7 子どもの画面の漢字（おとなのひと の画面は除く） =="
/usr/bin/python3 "$ROOT/tools/check_kana.py" --selftest || touch "$FAILFILE"
/usr/bin/python3 "$ROOT/tools/check_kana.py" || touch "$FAILFILE"
print "== 3c/7 公開物の書かない語（受験校・日程・受験番号） =="
/usr/bin/python3 "$ROOT/tools/check_private.py" "$ROOT/index.html" "$ROOT/README.md" "$ROOT/offline.appcache" || touch "$FAILFILE"
print "== 4/7 ホーム画面の絵 =="
/usr/bin/python3 "$ROOT/tools/make_icon.py" --check || touch "$FAILFILE"
print "== 5/6 自己点検（ブラウザで実行） =="
TMP="$ROOT/logs/selftest_dom.html"
"$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 \
  --dump-dom "file://$ROOT/tools/test.html" > "$TMP" 2>/dev/null
RESULT=$(/usr/bin/python3 "$ROOT/tools/read_selftest.py" "$TMP")
print -r -- "$RESULT"
print -r -- "$RESULT" | head -1 | grep -q '^PASS=[0-9]* FAIL=0$' || touch "$FAILFILE"
print "== 6/6 iPad よこおきで 1がめんに おさまるか（1024×640・ぜんぶの がめん・無音の複製で） =="
/usr/bin/python3 "$ROOT/tools/mkpage.py" --selftest || touch "$FAILFILE"
/usr/bin/python3 "$ROOT/tools/mkpage.py" || touch "$FAILFILE"
FIT=$("$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 \
  --dump-dom "file://$ROOT/tools/fit_check.html#size=1024x640" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed -e 's/<pre id="out">//' -e 's/<\/pre>//')
print -r -- "$FIT"
# 合格は「FIT=PASS」だけの行（検査ページの中の文字には一致させない）
print -r -- "$FIT" | grep -qx 'FIT=PASS' || touch "$FAILFILE"
print "== 7/7 てんせん＝点の タップが 線になり できた！が 正解になるか（無音の複製で） =="
TAP=$("$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 --window-size=1040,700 \
  --dump-dom "file://$ROOT/tools/tap_check.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed -e 's/<pre id="out">//' -e 's/<\/pre>//')
print -r -- "$TAP"
print -r -- "$TAP" | grep -qx 'TAP=PASS' || touch "$FAILFILE"
print "== 8/8 きめこまかい画面（dpr=2・iPad と同じ）で キャンバスが育たず タップが線になるか（無音の複製で） =="
DPR=$("$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 --window-size=1040,700 --force-device-scale-factor=2 \
  --dump-dom "file://$ROOT/tools/dpr_probe.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed -e 's/<pre id="out">//' -e 's/<\/pre>//')
print -r -- "$DPR"
print -r -- "$DPR" | grep -qx 'DPR=PASS' || touch "$FAILFILE"
TAP2=$("$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 --window-size=1040,700 --force-device-scale-factor=2 \
  --dump-dom "file://$ROOT/tools/tap_check.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed -e 's/<pre id="out">//' -e 's/<\/pre>//')
print -r -- "$TAP2" | sed 's/^TAP/TAP(dpr2)/'
print -r -- "$TAP2" | grep -qx 'TAP=PASS' || touch "$FAILFILE"
if [[ -e "$FAILFILE" ]]; then print "== けっか: FAIL =="; else print "== けっか: PASS =="; fi
} 2>&1 | tee "$LOG"
if [[ -e "$FAILFILE" ]]; then rm -f "$FAILFILE"; exit 1; fi
exit 0
