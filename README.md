# clawd-tales

A pixel Clawd that acts out what Claude Code is doing, in a band above your prompt.

[Claude Fables](https://github.com/henrik-thevibe/Claude-Fables) draws a model-written cartoon of your session in the desktop app. clawd-tales does it in the terminal from templates, so it costs no tokens.

![clawd-tales demo](assets/demo.gif)

*The 45-second `/tales demo`: helpers walk in, tests fail and bugs drop, Claude calls for you, a storm rolls in.*

Glance down and you know what Claude is doing. A red `!` and a jumping Clawd means it is waiting on you. Rain means the context is nearly full.

Every tool call gets a pose and a one-line caption. Claude reads a book for `Read`, digs for `Edit`, sneaks for `Grep`, runs for `Bash`, flies for web search. Subagents walk in as their own critters, colored by model.

## What it shows

| Happening in Claude Code | In the band |
|---|---|
| A tool call | Clawd's pose and a caption naming the file, pattern or command |
| A subagent starts | A helper walks in: purple for Opus, teal for Sonnet, green for Haiku, gold for Fable |
| A subagent finishes | It runs back to Clawd and they cheer, with hearts. A failed one trips and leaves |
| A permission dialog opens | Clawd jumps next to a red `!` and the caption turns red |
| A test run fails | Bugs drop onto the ground, one per failing test (up to 8) |
| The tests go green | Clawd eats the bugs |
| A todo list | Pending items sit on the ground as pellets. Finishing one is a gobble |
| Context fills up | Clouds at 50%, rain and an umbrella at 70%, lightning at 85% |
| The turn ends | A cheer, then Clawd sits, yawns and falls asleep. The band hides after 3 minutes; your next prompt wakes Clawd, and a new helper brings the band back |
| A plan limit hits 100% | Clawd sleeps until the reset time |

Under the caption, a status line shows `ctx 74% · 5h 22% · 7d 23%`, plus the todo count and a roster of the helpers. Numbers turn yellow at 80% and red at 95%.

The band shrinks with your terminal: the full band at 8 rows, no sky at 6, then a single line.

## Install

Needs a Claude Code build with mods (function hooks). Built and tested on 2.1.289. If the band never appears, your build may not support mods yet.

```sh
claude plugin marketplace add plaxagoras/clawd-tales
claude plugin install clawd-tales@clawd-tales
```

Start a new session, then run `/tales demo`.

To try it for one session without installing:

```sh
git clone https://github.com/plaxagoras/clawd-tales
claude --plugin-dir ./clawd-tales
```

## Commands

| Command | What it does |
|---|---|
| `/tales demo` | Plays a short story with helpers, bugs, pellets, weather and a permission call |
| `/tales calm` | One frame a second, and nobody wanders between tool calls |
| `/tales lively` | Back to 5 frames a second (the default) |
| `/tales off` / `/tales on` | Hide or show the band |
| `/tales` | Shows the current state |

Your on/off and calm settings are saved between sessions.

## How it works

It is a Claude Code mod: a plugin of function hooks in `hooks/register.tsx`. It listens to `tool.call`, `agent.spawn`, `classic.PermissionRequest`, `session.measure` and the turn events, and draws with `ui.render` on the `AbovePrompt` band. Each terminal cell is two pixels (`▀` with a foreground and a background color).

- No network, no model calls, no files written. It only reads what the hooks hand it.
- Test results come from the `Bash` output of commands that look like test runs (`npm test`, `pytest`, `cargo test`, `go test` and similar).
- Subagent end is detected by polling `$.agent.list()`.

### Limits

- A test runner whose command isn't on the list never drops bugs.
- A helper's finish can show a second or so late (about 5 seconds in calm mode), because the end is polled.

## Add a pose

Poses are pixel rows in `sprite()` in `hooks/art.ts`. Which tool gets which pose and caption is `beat()` in `hooks/story.ts`. Run `claude --plugin-dir .` and your edits reload as you go; `claude plugin test .` runs the tests. Pull requests with a short GIF of the new pose are welcome.

## Credits

The walk and cheer frames and the base palette come from Claude Fables by henrik-thevibe (MIT). See `NOTICE`.

Clawd is Anthropic's mascot. This is an unofficial fan project, not affiliated with Anthropic.

## License

MIT
