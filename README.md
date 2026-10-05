# clawd-tales

A pixel Clawd that acts out what Claude Code is doing, in a band above your prompt.

![clawd-tales demo](assets/demo.gif)

Every tool call gets a pose and a one-line caption. Claude reads a book for `Read`, digs for `Edit`, sneaks for `Grep`, runs for `Bash`, flies for web search. Subagents walk in as their own critters, colored by model. It runs in the terminal and makes no model calls, so it costs you nothing.

## What it shows

| Happening in Claude Code | On the stage |
|---|---|
| A tool call | Clawd's pose and a caption naming the file, pattern or command |
| A subagent starts | A helper walks in: purple for Opus, teal for Sonnet, green for Haiku, gold for Fable |
| A subagent finishes | It runs back to Clawd and they cheer, with hearts. A failed one trips and leaves |
| A permission dialog opens | Clawd jumps next to a red `!` and the caption turns red |
| A test run fails | Bugs drop onto the ground, one per failing test (up to 8) |
| The tests go green | Clawd eats the bugs |
| A todo list | Pending items sit on the ground as pellets. Finishing one is a gobble |
| Context fills up | Clouds at 50%, rain and an umbrella at 70%, lightning at 85% |
| The turn ends | A cheer, then Clawd sits, yawns and falls asleep. It hides after 3 minutes |
| A plan limit hits 100% | Clawd sleeps until the reset time |

Under the caption, a status line shows `ctx 74% · 5h 22% · 7d 23%`, plus the todo count and a roster of the helpers. Numbers turn yellow at 80% and red at 95%.

The stage shrinks with your terminal: full scene at 8 rows, no sky at 6, then a single line.

## Install

Needs a Claude Code build with mods (function hooks). Built and tested on 2.1.289.

```sh
claude plugin marketplace add plaxagoras/clawd-tales
claude plugin install clawd-tales@clawd-tales
```

Start a new session, then run `/tales demo` to watch a 45-second sample.

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
- Subagent end is detected by polling `$.agent.list()` about once a second.

Develop with hot reload: `claude --plugin-dir .`, then edit. Run the tests with `claude plugin test .`.

## Credits

The walk and cheer frames and the base palette come from [Claude Fables](https://github.com/henrik-thevibe/Claude-Fables) by henrik-thevibe (MIT). Fables draws a model-written cartoon in the desktop app; clawd-tales is a terminal take on the same idea without the model calls. See `NOTICE`.

Clawd is Anthropic's mascot. This is an unofficial fan project, not affiliated with Anthropic.

## License

MIT
