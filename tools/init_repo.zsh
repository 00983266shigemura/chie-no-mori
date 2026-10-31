# ちえの もり ── 手元の置き場（git）を 最初に 1回だけ 作る（.git が無いときだけ動く）
ROOT="/Users/shigemurasatoshi/dev/chie-no-mori"
if [[ -d "$ROOT/.git" ]]; then print "✓ もう あります＝$ROOT/.git"; exit 0; fi
/usr/bin/git init -q -b main "$ROOT" || { print "✕ 作れませんでした"; exit 1; }
/usr/bin/git -C "$ROOT" config user.name "重村 聡"
/usr/bin/git -C "$ROOT" config user.email "s.shige.muran@gmail.com"
print "logs/" > "$ROOT/.gitignore"
/usr/bin/git -C "$ROOT" add -A
/usr/bin/git -C "$ROOT" commit -q -F "$ROOT/tools/first_commit_msg.txt" || { print "✕ 記録できませんでした"; exit 1; }
/usr/bin/git -C "$ROOT" log --oneline | head -1
print "✓ 作りました"
