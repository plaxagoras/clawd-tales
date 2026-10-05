/**
 * Turns a tool call into an action and a one-line caption, from templates.
 * No model calls: Claude Fables asks Sonnet every few seconds; this reads the call itself.
 */
import type { Action, Emote, Holiday } from '../types'

export type Beat = { action: Action; caption: string }

type Args = Record<string, unknown>

function str(a: Args, key: string): string {
  const v = a[key]
  return typeof v === 'string' ? v : ''
}

function base(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

function host(url: string): string {
  const m = /^[a-z]+:\/\/([^/]+)/i.exec(url)
  return m?.[1] ?? url
}

function clip(text: string, room: number): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > room ? one.slice(0, room - 1) + '…' : one
}

/** A stable pick among phrasings, so a reload or redraw keeps the same line. */
function pick(lines: readonly string[], seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return lines[Math.abs(h) % lines.length] ?? lines[0] ?? ''
}

export function beat(tool: string, args: Args, seed: string): Beat {
  const file = base(str(args, 'file_path') || str(args, 'notebook_path') || str(args, 'path'))
  switch (tool) {
    case 'Read':
      return {
        action: 'read',
        caption: pick([`Claude pores over ${file}`, `Claude studies ${file}`, `Claude reads ${file} by lamplight`], seed),
      }
    case 'Edit':
    case 'NotebookEdit':
      return {
        action: 'dig',
        caption: pick([`Claude digs into ${file}`, `Claude reshapes ${file}`, `Claude tunnels through ${file}`], seed),
      }
    case 'Write':
      return { action: 'dig', caption: pick([`Claude builds ${file}`, `Claude lays the stones of ${file}`], seed) }
    case 'Grep':
    case 'Glob': {
      const what = clip(str(args, 'pattern'), 40)
      return {
        action: 'sneak',
        caption: pick([`Claude sniffs out “${what}”`, `Claude tracks “${what}” through the brush`], seed),
      }
    }
    case 'Bash': {
      const what = clip(str(args, 'description') || str(args, 'command'), 60)
      return { action: 'run', caption: pick([`Claude runs off to ${lower(what)}`, `Claude hurries: ${what}`], seed) }
    }
    case 'WebFetch':
      return { action: 'fly', caption: `Claude flies off to ${host(str(args, 'url'))}` }
    case 'WebSearch':
      return { action: 'fly', caption: `Claude scouts the skies for “${clip(str(args, 'query'), 40)}”` }
    case 'Agent':
    case 'Task':
      return { action: 'carry', caption: `Claude hands a parcel to a helper: ${clip(str(args, 'description'), 50)}` }
    case 'Skill':
      return { action: 'read', caption: `Claude opens the ${str(args, 'skill') || 'old'} spellbook` }
    case 'TodoWrite':
      return { action: 'read', caption: 'Claude writes the quest list' }
    case 'AskUserQuestion':
      return { action: 'alert', caption: 'Claude waves you over with a question' }
    default:
      if (tool.startsWith('mcp__')) {
        const server = tool.split('__')[1]?.replace(/^claude_ai_/, '').replace(/_/g, ' ') ?? 'a stranger'
        return { action: 'carry', caption: `Claude sends word to ${server}` }
      }
      return { action: 'walk', caption: `Claude tries the ${tool}` }
  }
}

function lower(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

export function tripCaption(tool: string, seed: string): string {
  return pick([`Claude trips over the ${tool} and dusts off`, `The ${tool} bites back. Claude regroups`], seed)
}

export const THINKING = ['Claude ponders the path ahead…', 'Claude wanders, thinking…', 'Claude mutters to itself…']

export function ending(steps: number, seconds: number, isAborted: boolean, best = 0): string {
  if (isAborted) return 'Claude stops mid-stride and takes a bow.'
  const s = steps === 1 ? 'step' : 'steps'
  return `The end · ${steps} ${s} · ${seconds}s${best >= CROWN_AT ? ` · crown ×${best}` : ''}`
}

/** Clean calls in a row that show a combo, and that earn the crown. */
export const COMBO_AT = 5
export const CROWN_AT = 10

/** How the prompt reads: thanks makes Claude blush, a scolding makes it sheepish. */
export function moodOf(text: string): 'thanks' | 'scold' | null {
  const t = text.slice(0, 400)
  if (/\b(thanks|thank (you|u)|thx|tysm|good (job|work|bot)|great (job|work)|nice (job|work)|well done|love (it|this|you)|you('re| are) (the best|awesome|amazing))\b/i.test(t)) {
    return 'thanks'
  }
  if (/^\s*(no+|nope|wrong|wtf|ugh+|stop)\b|\b(wtf|that'?s (wrong|not (it|right|what))|not what i (asked|said|meant|wanted)|i already told you|you broke)\b/i.test(t)) {
    return 'scold'
  }
  return null
}

export type Egg = 'commit' | 'push' | 'nuke' | 'install' | 'sl'

/** The fun Bash commands, most specific first. */
export function bashEggs(command: string): Egg[] {
  const out: Egg[] = []
  if (/^\s*sl(\s|$)/.test(command)) out.push('sl')
  if (/\bgit\s+(-C\s+\S+\s+)?commit\b/.test(command)) out.push('commit')
  if (/\bgit\s+(-C\s+\S+\s+)?push\b/.test(command)) out.push('push')
  if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\s+-f|-f\s+-r|--recursive\s+--force|--force\s+--recursive)/.test(command)) {
    out.push('nuke')
  }
  if (/\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b|\bpip3?\s+install\b|\buv\s+(add|pip\s+install)\b|\bcargo\s+(add|install)\b|\b(apt|apt-get|brew|dnf)\s+install\b|\bgo\s+get\b/.test(command)) {
    out.push('install')
  }
  return out
}

/** A commit's first line, from -m "…" or a heredoc. */
export function commitMessage(command: string): string {
  const doc = /<<-?\s*'?"?(\w+)'?"?\s*\n\s*([^\n]+)/.exec(command)
  const flag = /\s-[a-zA-Z]*m\s+(["'])((?:(?!\1)[^\n])*)/.exec(command)
  const msg = doc?.[2] ?? (flag?.[2]?.startsWith('$(') ? '' : flag?.[2]) ?? ''
  return clip(msg, 50)
}

export function pushRemote(command: string): string {
  const m = /\bgit\s+(?:-C\s+\S+\s+)?push\s+(?:-\S+\s+)*([\w.-]+)/.exec(command)
  return m?.[1] ?? 'origin'
}

/** Before the command runs. */
export function eggBeat(egg: Egg, command: string): Beat & { emote?: Emote } {
  switch (egg) {
    case 'commit': {
      const msg = commitMessage(command)
      return { action: 'carry', caption: msg ? `Claude wraps a parcel: “${msg}”` : 'Claude wraps up a commit' }
    }
    case 'push':
      return { action: 'carry', caption: `Claude folds a paper plane for ${pushRemote(command)}` }
    case 'nuke':
      return { action: 'cover', caption: `Claude covers its eyes: ${clip(command.trim(), 40)}`, emote: 'sweat' }
    case 'install':
      return { action: 'carry', caption: 'Claude orders packages from the sky' }
    case 'sl':
      return { action: 'cheer', caption: 'Choo choo!' }
  }
}

/** After it ran cleanly. */
export function eggDone(egg: Egg, command: string): string | null {
  switch (egg) {
    case 'commit': {
      const msg = commitMessage(command)
      return msg ? `Claude seals the parcel and stamps it: “${msg}”` : 'Claude seals the parcel and stamps it'
    }
    case 'push':
      return `The paper plane sails off to ${pushRemote(command)}`
    case 'install':
      return 'Packages rain down. Claude stacks them'
    default:
      return null
  }
}

/** The program a "command not found" names, or null. */
export function notFound(output: string): string | null {
  const m = /(?:^|\n)(?:[\w/.-]+: )?(?:line \d+: )?([\w.+-]+): (?:command )?not found/.exec(output)
  return m?.[1] ?? null
}

/** Today's holiday, by local date. */
export function holidayOf(d: Date): Holiday | null {
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (m === 10 && day >= 25) return 'halloween'
  if (m === 12 && day >= 18 && day <= 26) return 'christmas'
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return 'newyear'
  if (m === 2 && day === 14) return 'valentine'
  if (m === 4 && day === 1) return 'aprilfools'
  return null
}

/** Fireworks: the hour either side of midnight on New Year's. */
export function isMidnightNewYear(d: Date): boolean {
  return (d.getMonth() === 11 && d.getDate() === 31 && d.getHours() === 23) || (d.getMonth() === 0 && d.getDate() === 1 && d.getHours() === 0)
}

export type Sky = 'day' | 'dusk' | 'night'
export function skyOf(hour: number): Sky {
  if (hour >= 20 || hour < 6) return 'night'
  if (hour < 7 || hour >= 18) return 'dusk'
  return 'day'
}

/** 1 to 4 am: nightcap and coffee. */
export function isLate(hour: number): boolean {
  return hour >= 1 && hour < 5
}

const HOLIDAY_START: Record<Holiday, string> = {
  halloween: 'Once upon a spooky prompt, Claude set out…',
  christmas: 'Once upon a snowy prompt, Claude set out…',
  newyear: 'Once upon a brand-new prompt, Claude set out…',
  valentine: 'Once upon a lovely prompt, Claude set out…',
  aprilfools: 'Once upon a prompt, Claude set out… backwards.',
}

/** The opening caption: the mood of the prompt first, then waking, the holiday, the hour. */
export function startCaption(o: { mood: 'thanks' | 'scold' | null; woke: boolean; holiday: Holiday | null; hour: number }): string {
  if (o.mood === 'thanks') return 'Claude blushes and sets out again…'
  if (o.mood === 'scold') return 'Claude rubs its head sheepishly and tries again…'
  if (o.woke) return 'Claude wakes with a start and sets out…'
  if (o.holiday) return HOLIDAY_START[o.holiday]
  if (isLate(o.hour)) return 'Claude pours a coffee and sets out…'
  return 'Once upon a prompt, Claude set out…'
}

export type Fidget = { action: Action; caption: string; emote?: Emote }
export const FIDGETS: readonly Fidget[] = [
  { action: 'wave', caption: 'Claude waves at you.' },
  { action: 'scratch', caption: 'Claude scratches its head.' },
  { action: 'look', caption: 'Claude looks around.' },
  { action: 'sit', caption: 'A butterfly visits Claude.', emote: 'butterfly' },
  { action: 'wink', caption: 'Claude winks at you.' },
]
export const FIDGET_SLOT_MS = 7000
export const FIDGET_MS = 3000

/** While sitting: a fidget for the first few seconds of every slot but the first. */
export function fidgetAt(sitFor: number, seed: number): Fidget | null {
  if (sitFor >= REST.fishMs) return null
  const slot = Math.floor(sitFor / FIDGET_SLOT_MS)
  if (slot === 0 || sitFor - slot * FIDGET_SLOT_MS >= FIDGET_MS) return null
  return FIDGETS[Math.abs(seed + slot * 7) % FIDGETS.length] ?? null
}

const DREAMS: Partial<Record<Action, string>> = {
  read: 'books',
  dig: 'tunnels',
  sneak: 'hidden trails',
  run: 'open roads',
  fly: 'the sky',
  carry: 'parcels',
  cover: 'scary commands',
}
export function dreamOf(last: Action | undefined): string {
  return (last && DREAMS[last]) || 'electric sheep'
}

const TEST_CMD = /\b(test|tests|pytest|jest|vitest|mocha|rspec|phpunit|tox|nox)\b|cargo t\b|go test|npm t\b|bun test|plugin test/i

/** Pass and fail counts from a test run's output, or null when it isn't one. */
export function testCounts(command: string, output: string): { failed: number; passed: number } | null {
  if (!TEST_CMD.test(command)) return null
  const num = (re: RegExp) => {
    let best = -1
    for (const m of output.matchAll(re)) best = Math.max(best, Number(m[1]))
    return best
  }
  const failed = num(/(\d+)\s+(?:failed|failing|fail\b|failures?\b|errors?\b)/gi)
  const passed = num(/(\d+)\s+(?:passed|passing|pass\b|ok\b)/gi)
  if (failed < 0 && passed < 0) return null
  return { failed: Math.max(0, failed), passed: Math.max(0, passed) }
}

export const REST = { fishMs: 15_000, sitMs: 45_000, yawnMs: 53_000, hideMs: 180_000 }

/** A long wait: Claude casts a line, and every so often something bites. */
export const BITE_EVERY_MS = 12_000
export const BITE_MS = 3_000
export function fishing(sitFor: number): Fidget | null {
  if (sitFor < REST.fishMs || sitFor >= REST.sitMs) return null
  const t = sitFor - REST.fishMs
  if (t > BITE_MS && t % BITE_EVERY_MS < BITE_MS) {
    return { action: 'reel', caption: 'A bite! Claude reels in a fish… and lets it go.' }
  }
  return { action: 'fish', caption: 'Claude casts a line while it waits for you.' }
}

export function restCaption(action: 'sit' | 'yawn' | 'sleep', last?: Action): string {
  if (action === 'sit') return 'Claude sits by the path and waits for you.'
  if (action === 'yawn') return 'Claude yawns…'
  return `Claude dozes off, dreaming of ${dreamOf(last)}. z z z`
}

export function clockTime(iso: string | undefined): string {
  if (!iso) return 'reset'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'reset'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
