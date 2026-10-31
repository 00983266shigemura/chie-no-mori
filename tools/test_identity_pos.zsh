# ちえの もり ── 名義の「通る側」の動作テスト（通信は GitHub の利用者番号の照会だけ・公開先は手元の空の置き場）
#   (1) 初期化スクリプトが作る置き場の名義が公開用（名前=OWNER・メール=<番号>+OWNER@users.noreply.github.com）になるか
#   (2) その置き場で公開スクリプトを回すと、名義の検査を通って 6/9 の送信まで進むか（送信先は手元の空の置き場）
#       9/9 の本番照合は通信が無いので「一致しません」で止まるのが想定（＝送信まで進んだ証拠は 7/9 の ✓ と、置き場に main があること）
#   使い方＝ zsh tools/test_identity_pos.zsh [作業場所]
# 終了コード 0=想定どおり / 1=想定と違う
ROOT="/Users/shigemurasatoshi/dev/chie-no-mori"
WORK="${1:-/tmp/cm_id_pos_$$}"
OWNER="00983266shigemura"
RE="^${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\|${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\$"
bad=0
rm -rf "$WORK"; mkdir -p "$WORK/logs"
# 作業中の中身を .git と logs 抜きで複製する
/usr/bin/rsync -a --exclude '.git' --exclude 'logs' "$ROOT/" "$WORK/app/" || { print "✕ 複製に失敗"; exit 1; }

print "== (1) 初期化スクリプト =="
out="$(zsh "$ROOT/tools/init_repo.zsh" "$WORK/app" 2>&1)"; rc=$?
print -r -- "$out" | tail -3
name="$(/usr/bin/git -C "$WORK/app" config user.name)"
mail="$(/usr/bin/git -C "$WORK/app" config user.email)"
badid="$(/usr/bin/git -C "$WORK/app" log --format='%an|%ae|%cn|%ce' | grep -v -E "$RE" | wc -l | tr -d ' ')"
n="$(/usr/bin/git -C "$WORK/app" rev-list --count HEAD)"
if [[ $rc -eq 0 && "$name" == "$OWNER" && "$mail" == *"+${OWNER}@users.noreply.github.com" && "$badid" == "0" && "$n" == "1" ]]; then
  print "✓ (1) 名義は公開用（${name} / ${mail}）・記録1件・名義の違う記録=0"
else
  print "✕ (1) 想定と違う（exit=$rc name=${name} mail=${mail} badid=${badid} n=${n}）"; bad=1
fi

print "== (2) 公開スクリプト（送信先＝手元の空の置き場） =="
/usr/bin/git init -q --bare "$WORK/origin"
out="$(KZ_REPO_DIR="$WORK/app" KZ_LOG_DIR="$WORK/logs" KZ_GH=/usr/bin/true KZ_ORIGIN_URL="$WORK/origin" KZ_PAGES_URL="http://127.0.0.1:9/" KZ_TRIES=1 KZ_WAIT=0 zsh "$ROOT/push.zsh" 2>&1)"; rc=$?
print -r -- "$out" | grep -E '^(✓|✕|==)'
pushed="$(/usr/bin/git -C "$WORK/origin" rev-parse main 2>/dev/null)"
local_sha="$(/usr/bin/git -C "$WORK/app" rev-parse HEAD)"
if print -r -- "$out" | grep -q "✓ 記録の名義はすべて公開用" && print -r -- "$out" | grep -q "✓ 手元＝公開先" && [[ "$pushed" == "$local_sha" ]] && [[ $rc -eq 1 ]] && print -r -- "$out" | grep -q "一致しません"; then
  print "✓ (2) 名義の検査を通り、送信まで進んだ（置き場の main=${pushed:0:7}）。本番照合は通信なしのため想定どおり止まった"
else
  print "✕ (2) 想定と違う（exit=$rc pushed=${pushed:0:7} local=${local_sha:0:7}）"; bad=1
fi
rm -rf "$WORK"
[[ $bad -eq 0 ]] && print "== けっか: PASS（2/2） ==" || print "== けっか: FAIL =="
exit $bad
