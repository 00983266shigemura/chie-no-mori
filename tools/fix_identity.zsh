# ちえの もり ── 記録（コミット）の名義を公開用（00983266shigemura・GitHubの非公開メール）にそろえ、そのまま公開する
#   しげ承認＝2026-11-01「名義をそろえて公開して」（手元の記録だけを書き換える。公開先にはまだ何も無い）
#   使い方＝ zsh ~/dev/chie-no-mori/tools/fix_identity.zsh            （本番＝そろえたあと push.zsh を続けて実行）
#           zsh tools/fix_identity.zsh <複製の場所> --no-push          （試験＝そろえて確かめるだけ）
#   中身（ファイルの内容・木の値）は変えない。変えるのは「誰が記録したか」の名前とメールだけ。
#   元の記録は refs/original/ に控えが残る（戻せる）。
set -u
ROOT="${1:-/Users/shigemurasatoshi/dev/chie-no-mori}"
MODE="${2:-push}"
OWNER="00983266shigemura"
GH="/Users/shigemurasatoshi/dev/tools/gh_2.97.0_macOS_arm64/bin/gh"
GIT=/usr/bin/git
RUN_ID="fixid_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/run_${RUN_ID}.log"
exec > >(tee -a "$LOG") 2>&1
print "BEGIN run_id=${RUN_ID} root=${ROOT}"
stop() { print "✕ 中止：$1"; print "END run_id=${RUN_ID} exit=1"; exit 1; }

[[ -d "$ROOT/.git" ]] || stop "置き場が見つかりません＝${ROOT}"
[[ -z "$("$GIT" -C "$ROOT" status --porcelain)" ]] || stop "未保存の直しがあります（何もしていません）"
GH_ID="$("$GH" api user --jq .id)" || stop "GitHub の利用者番号を取れませんでした"
PUB_MAIL="${GH_ID}+${OWNER}@users.noreply.github.com"
TREE0="$("$GIT" -C "$ROOT" rev-parse 'HEAD^{tree}')"
HEAD0="$("$GIT" -C "$ROOT" rev-parse --short HEAD)"
N0="$("$GIT" -C "$ROOT" rev-list --count HEAD)"
MD5_0="$(/sbin/md5 -q "$ROOT/index.html")"

print "== 1/3 これからの記録の名義 =="
"$GIT" -C "$ROOT" config user.name "$OWNER" || stop "名前を設定できませんでした"
"$GIT" -C "$ROOT" config user.email "$PUB_MAIL" || stop "メールを設定できませんでした"
print "✓ $("$GIT" -C "$ROOT" config user.name)（$("$GIT" -C "$ROOT" config user.email)）"

print "== 2/3 これまでの記録の名義を書き換え（手元だけ・中身は変えない） =="
FILTER_BRANCH_SQUELCH_WARNING=1 "$GIT" -C "$ROOT" filter-branch -f \
  --env-filter "export GIT_AUTHOR_NAME='${OWNER}'; export GIT_AUTHOR_EMAIL='${PUB_MAIL}'; export GIT_COMMITTER_NAME='${OWNER}'; export GIT_COMMITTER_EMAIL='${PUB_MAIL}'" \
  -- --all > /dev/null 2>&1 || stop "書き換えに失敗しました"
print "✓ 書き換えました（元の記録の控え＝refs/original/）"

print "== 3/3 確かめ（中身が同じか・名義がそろったか） =="
TREE1="$("$GIT" -C "$ROOT" rev-parse 'HEAD^{tree}')"
N1="$("$GIT" -C "$ROOT" rev-list --count HEAD)"
MD5_1="$(/sbin/md5 -q "$ROOT/index.html")"
RE="^${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\|${OWNER}\|[0-9]+\+${OWNER}@users\.noreply\.github\.com\$"
BAD="$("$GIT" -C "$ROOT" log --format='%an|%ae|%cn|%ce' | grep -v -E "$RE" | wc -l | tr -d ' ')"
[[ "$TREE0" == "$TREE1" ]] || stop "中身の木の値が変わりました（${TREE0}→${TREE1}）"
[[ "$N0" == "$N1" ]] || stop "記録の数が変わりました（${N0}→${N1}）"
[[ "$MD5_0" == "$MD5_1" ]] || stop "index.html が変わりました"
[[ "$BAD" == "0" ]] || stop "名義のそろっていない記録が ${BAD} 件 残っています"
print "✓ 中身は同じ（木=${TREE1} 記録数=${N1} index.html md5=${MD5_1}）・名義の違う記録=0"
print "記録番号 旧=${HEAD0} 新=$("$GIT" -C "$ROOT" rev-parse --short HEAD)（旧の番号を書いた文書は 旧→新 に直す＝vault の sweep_old_text.zsh で残りを探す）"

if [[ "$MODE" == "--no-push" ]]; then
  print "（試験＝公開はしません）"
  print "END run_id=${RUN_ID} exit=0"
  exit 0
fi
print "END run_id=${RUN_ID} exit=0"
print "== つづけて 公開（push.zsh） =="
exec /bin/zsh "$ROOT/push.zsh"
