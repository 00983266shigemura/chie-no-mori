# ちえの もり ── 画面の撮影（CCが目で確かめる用・無音の複製で）。使い方＝ zsh tools/shots.zsh [tag…]
#   tag＝home / play<型> / hint<型> / ans<型> / story<型> / result<型> / zukan（fit_check.html の meas の名前）
ROOT="/Users/shigemurasatoshi/dev/chie-no-mori"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ $# -ge 1 ]] || set -- home playkisetsu playkotoba storyohanashi playohanashi hintkisetsu resultkisetsu
/usr/bin/python3 "$ROOT/tools/mkpage.py" > /dev/null || exit 1
for t in "$@"; do
  TMR=""; [[ "$t" == timer* ]] && { TMR="&timer=1"; t="${t#timer}"; }
  "$CHROME" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --virtual-time-budget=20000 --window-size=1024,700 --hide-scrollbars \
    --screenshot="$ROOT/logs/shot_$t.png" "file://$ROOT/tools/fit_check.html#size=1024x640&shot=$t$TMR" > /dev/null 2>&1
  [[ -s "$ROOT/logs/shot_$t.png" ]] && print "✓ $t → logs/shot_$t.png" || print "✕ $t"
done
