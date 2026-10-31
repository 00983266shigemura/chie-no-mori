# ちえの もり ── fix_identity.zsh の動作テスト（本物の置き場には触れない・複製の上で回す）
#   (1) 複製（名義が本名・個人メールの記録を含む）で fix_identity.zsh --no-push を回す → 名義がそろい、中身は同じ
#   (2) その複製で公開スクリプトを回す → 名義の検査を通って、手元の空の置き場へ送信まで進む
#   使い方＝ zsh tools/test_fix_identity.zsh [作業場所]
# 終了コード 0=想定どおり / 1=想定と違う
ROOT="/Users/shigemurasatoshi/dev/chie-no-mori"
WORK="${1:-/tmp/cm_fixid_$$}"
OWNER="00983266shigemura"
RE="^${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\|${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\$"
bad=0
rm -rf "$WORK"; mkdir -p "$WORK/logs"
/usr/bin/git clone -q "$ROOT" "$WORK/app" || { print "✕ 複製に失敗"; exit 1; }
cp "$ROOT/icon.png" "$WORK/app/icon.png"
# 複製に本名・個人メールの記録を1件足す（本物の置き場の状態に依らず、直す対象が必ずある形にする）
/usr/bin/git -C "$WORK/app" -c user.name="本名 太郎" -c user.email="private@example.com" commit -q --allow-empty -m "test private identity"
before_bad="$(/usr/bin/git -C "$WORK/app" log --format='%an|%ae|%cn|%ce' | grep -v -E "$RE" | wc -l | tr -d ' ')"
before_tree="$(/usr/bin/git -C "$WORK/app" rev-parse 'HEAD^{tree}')"
before_n="$(/usr/bin/git -C "$WORK/app" rev-list --count HEAD)"
before_msgs="$(/usr/bin/git -C "$WORK/app" log --format='%s' | /sbin/md5 -q)"

print "== (1) fix_identity.zsh --no-push（直す前＝名義の違う記録 ${before_bad} 件） =="
out="$(zsh "$ROOT/tools/fix_identity.zsh" "$WORK/app" --no-push 2>&1)"; rc=$?
print -r -- "$out" | grep -E '^(✓|✕|END)'
after_bad="$(/usr/bin/git -C "$WORK/app" log --format='%an|%ae|%cn|%ce' | grep -v -E "$RE" | wc -l | tr -d ' ')"
after_tree="$(/usr/bin/git -C "$WORK/app" rev-parse 'HEAD^{tree}')"
after_n="$(/usr/bin/git -C "$WORK/app" rev-list --count HEAD)"
after_msgs="$(/usr/bin/git -C "$WORK/app" log --format='%s' | /sbin/md5 -q)"
backup="$(/usr/bin/git -C "$WORK/app" rev-parse refs/original/refs/heads/main 2>/dev/null)"
if [[ $rc -eq 0 && "$before_bad" != "0" && "$after_bad" == "0" && "$before_tree" == "$after_tree" && "$before_n" == "$after_n" && "$before_msgs" == "$after_msgs" && -n "$backup" ]]; then
  print "✓ (1) 名義の違う記録 ${before_bad}→0・中身の木は同じ・記録数 ${after_n} は同じ・件名は同じ・元の控えあり（${backup:0:7}）"
else
  print "✕ (1) 想定と違う（exit=$rc bad ${before_bad}→${after_bad} tree同じ=$([[ "$before_tree" == "$after_tree" ]] && print yes || print no) n ${before_n}→${after_n} msgs同じ=$([[ "$before_msgs" == "$after_msgs" ]] && print yes || print no) backup=${backup:0:7}）"; bad=1
fi

print "== (2) 直した複製で公開スクリプト（送信先＝手元の空の置き場） =="
/usr/bin/git init -q --bare "$WORK/origin"
/usr/bin/git -C "$WORK/app" remote set-url origin "$WORK/origin"
out="$(KZ_REPO_DIR="$WORK/app" KZ_LOG_DIR="$WORK/logs" KZ_GH=/usr/bin/true KZ_ORIGIN_URL="$WORK/origin" KZ_PAGES_URL="http://127.0.0.1:9/" KZ_TRIES=1 KZ_WAIT=0 zsh "$ROOT/push.zsh" 2>&1)"; rc=$?
print -r -- "$out" | grep -E '^(✓|✕)' | grep -E '名義|手元＝公開先|一致しません'
pushed="$(/usr/bin/git -C "$WORK/origin" rev-parse main 2>/dev/null)"
local_sha="$(/usr/bin/git -C "$WORK/app" rev-parse HEAD)"
if print -r -- "$out" | grep -q "✓ 記録の名義はすべて公開用" && [[ "$pushed" == "$local_sha" ]] && [[ $rc -eq 1 ]] && print -r -- "$out" | grep -q "一致しません"; then
  print "✓ (2) 名義の検査を通り、送信まで進んだ（置き場の main=${pushed:0:7}）。本番照合は通信なしのため想定どおり止まった"
else
  print "✕ (2) 想定と違う（exit=$rc pushed=${pushed:0:7} local=${local_sha:0:7}）"; bad=1
fi
rm -rf "$WORK"
[[ $bad -eq 0 ]] && print "== けっか: PASS（2/2） ==" || print "== けっか: FAIL =="
exit $bad
