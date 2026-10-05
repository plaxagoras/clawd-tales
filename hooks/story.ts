/**
 * Turns a tool call into an action and a one-line caption, from templates.
 * No model calls: Claude Fables asks Sonnet every few seconds; this reads the call itself.
 */
import type { Action } from '../types'

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

export function ending(steps: number, seconds: number, isAborted: boolean): string {
  if (isAborted) return 'Claude stops mid-stride and takes a bow.'
  const s = steps === 1 ? 'step' : 'steps'
  return `The end · ${steps} ${s} · ${seconds}s`
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

export const REST = { sitMs: 20_000, yawnMs: 28_000, hideMs: 180_000 }

export function restCaption(action: 'sit' | 'yawn' | 'sleep'): string {
  if (action === 'sit') return 'Claude sits by the path and waits for you.'
  if (action === 'yawn') return 'Claude yawns…'
  return 'Claude dozes off. z z z'
}

export function clockTime(iso: string | undefined): string {
  if (!iso) return 'reset'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'reset'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
