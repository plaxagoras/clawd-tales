# Records assets/demo.gif: run `vhs assets/demo.tape` from the repo root.
Output assets/demo.gif

Set Shell "bash"
Set FontFamily "JetBrainsMono Nerd Font"
Set FontSize 15
Set Width 1300
Set Height 640
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type `mkdir -p /tmp/clawd-demo && cd /tmp/clawd-demo && clear && env -i HOME="$HOME" PATH="$PATH" TERM=xterm-256color COLORTERM=truecolor LANG=C.UTF-8 claude --model sonnet` Enter
Sleep 5s
# First run in a new folder asks to trust it: take "Yes".
Down
Enter
Sleep 8s
Show

Type "/tales demo"
Sleep 400ms
Enter
Sleep 48s
