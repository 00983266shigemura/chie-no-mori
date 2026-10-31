# ちえの もり ── 手元の置き場（git）を 最初に 1回だけ 作る（.git が無いときだけ動く）
ROOT="${1:-/Users/shigemurasatoshi/dev/chie-no-mori}"   # 試験のときだけ 複製の場所を渡す
if [[ -d "$ROOT/.git" ]]; then print "✓ もう あります＝$ROOT/.git"; exit 0; fi
/usr/bin/git init -q -b main "$ROOT" || { print "✕ 作れませんでした"; exit 1; }
# 記録の名義は公開用（GitHubの利用者名と、GitHubが用意する非公開メール）だけ。本名・個人のメールを書かない（2026-11-01 送信拒否 GH007 の再発防止）
OWNER="00983266shigemura"
GH="/Users/shigemurasatoshi/dev/tools/gh_2.97.0_macOS_arm64/bin/gh"
GH_ID="$("$GH" api user --jq .id)" || { print "✕ GitHub の利用者番号を取れませんでした"; exit 1; }
/usr/bin/git -C "$ROOT" config user.name "$OWNER"
/usr/bin/git -C "$ROOT" config user.email "${GH_ID}+${OWNER}@users.noreply.github.com"
print "logs/" > "$ROOT/.gitignore"
/usr/bin/git -C "$ROOT" add -A
/usr/bin/git -C "$ROOT" commit -q -F "$ROOT/tools/first_commit_msg.txt" || { print "✕ 記録できませんでした"; exit 1; }
/usr/bin/git -C "$ROOT" log --oneline | head -1
print "✓ 作りました"
