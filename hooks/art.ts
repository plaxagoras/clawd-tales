/**
 * The stage, drawn with half blocks: each terminal cell is two pixels, the top
 * one the glyph's color and the bottom one its background.
 * Hero walk and cheer frames from Claude Fables (henrik-thevibe/Claude-Fables), MIT;
 * the other poses, the scenery, the weather and the critters are ours.
 */
import type { Action, Hero, Worker } from '../types'

const PALETTE: Record<string, string> = {
  o: '#d97757', // Claude orange
  k: '#1f1e1d', // ink
  p: '#9b7fd4', // Opus purple
  t: '#5fb8b0', // Sonnet teal
  h: '#8fcf6a', // Haiku green
  f: '#e0b84c', // Fable gold
  e: '#8a8780', // other / failed: stone
  b: '#5b8dd9', // book cover
  B: '#ece6d6', // pages
  s: '#8b5a2b', // handle
  m: '#b8b8b8', // metal
  d: '#6b4a2e', // dirt
  w: '#f2f2f2', // wing, z
  y: '#d9b35b', // box
  z: '#f2d24b', // star
  r: '#e5534b', // alert
  q: '#f27fa5', // heart
  v: '#a7afb8', // cloud
  j: '#6fa8dc', // rain
  l: '#fff27a', // lightning
  U: '#c0504d', // umbrella
  x: '#b03a2e', // bug
  Y: '#f5d76e', // pellet
  G: '#3f8f4a', // leaves
  P: '#2f6b4a', // pine
  T: '#7a5230', // trunk
  C: '#5d9b4f', // cactus
  R: '#7a3b3b', // roof
  H: '#8a6f5a', // wall
  L: '#f2d24b', // lit window
  M: '#f2eecb', // moon
  g: '#4f7f3a', // grass
  S: '#d8b26e', // sand
  N: '#3a3a5a', // night ground
  W: '#e8eef2', // snow
}

type Sprite = readonly string[]

const LEGS_A = '..o.o...o.o..'
const LEGS_B = '...o.o.o.o...'

const STAND: Sprite = [
  '..ooooooooo..',
  '..ooooooooo..',
  '..okoooooko..',
  '..okoooooko..',
  'ooooooooooooo',
  'ooooooooooooo',
  '..ooooooooo..',
  LEGS_A,
  LEGS_A,
]
const STRIDE: Sprite = [...STAND.slice(0, 7), LEGS_B, '..o..o...o.o.']

const CHEER: Sprite = [
  'o.ooooooooo.o',
  'o.ooooooooo.o',
  'ooo.ooooo.ooo',
  '..okoooooko..',
  '..ooooooooo..',
  '..ooooooooo..',
  '..ooooooooo..',
  LEGS_A,
  LEGS_A,
]

/** Arms up and a red "!" beside the head: something needs the user. */
const ALERT: Sprite = [
  'o.ooooooooo.o.rr',
  'o.ooooooooo.o.rr',
  'ooookoooookoo.rr',
  '..okoooooko...rr',
  '..ooooooooo.....',
  '..ooooooooo...rr',
  '..ooooooooo.....',
  LEGS_A,
  LEGS_A,
]

const SIT: Sprite = [
  '..ooooooooo..',
  '..ooooooooo..',
  '..okoooooko..',
  '..okoooooko..',
  'ooooooooooooo',
  'ooooooooooooo',
  '.ooooooooooo.',
]

const YAWN: Sprite = [
  '..ooooooooo..',
  '..ooooooooo..',
  '..kkoooookk..',
  '..ooookoooo..',
  'oooookkkooooo',
  'ooooooooooooo',
  '.ooooooooooo.',
]

const SLEEP: Sprite = [
  '..ooooooooo..',
  '..kkoooookk..',
  '.ooooooooooo.',
  'ooooooooooooo',
  '.ooooooooooo.',
]

const READ: Sprite[] = [
  [
    '..ooooooooo......',
    '..ooooooooo......',
    '..okoooooko......',
    '..okoooooko.BBBb.',
    'ooooooooooooBBBb.',
    'oooooooooooobBBb.',
    '..ooooooooo.bbbb.',
    LEGS_A,
    LEGS_A,
  ],
  [
    '..ooooooooo......',
    '..ooooooooo......',
    '..ooooooooo......', // blink
    '..okoooooko.BBBb.',
    'ooooooooooooBbBb.',
    'oooooooooooobbBb.',
    '..ooooooooo.bbbb.',
    LEGS_A,
    LEGS_A,
  ],
]

const DIG: Sprite[] = [
  [
    '..ooooooooo....m.',
    '..ooooooooo...s..',
    '..okoooooko..s...',
    '..okoooooko.s....',
    'ooooooooooooo....',
    'ooooooooooooo....',
    '..ooooooooo......',
    LEGS_A,
    LEGS_A,
  ],
  [
    '..ooooooooo...d..',
    '..ooooooooo.d...d',
    '..okoooooko......',
    '..okoooooko......',
    'ooooooooooooos...',
    'ooooooooooooo.s..',
    '..ooooooooo....s.',
    '..o.o...o.o....mm',
    '..o.o...o.o....mm',
  ],
]

const FLY: Sprite[] = [
  [
    'ww.........ww',
    '.wooooooooow.',
    '..ooooooooo..',
    '..okoooooko..',
    '..okoooooko..',
    '.ooooooooooo.',
    '..ooooooooo..',
    '...o.....o...',
  ],
  [
    '.............',
    '..ooooooooo..',
    '..ooooooooo..',
    '..okoooooko..',
    'w.okoooooko.w',
    'wwoooooooooww',
    'w.ooooooooo.w',
    '...o.....o...',
  ],
]

const CARRY_TOP: Sprite = [
  '..yyyyyyyyy..',
  '..ysyyyyysy..',
  'o.yyyyyyyyy.o',
  'o.ooooooooo.o',
  'o.ooooooooo.o',
  'ooookoooookoo',
  '..okoooooko..',
  '..ooooooooo..',
  '..ooooooooo..',
]
const CARRY: Sprite[] = [
  [...CARRY_TOP, LEGS_A, LEGS_A],
  [...CARRY_TOP, LEGS_B, '..o..o...o.o.'],
]

const SNEAK: Sprite[] = [
  ['..ooooooooo..', '..okoooooko..', 'ooooooooooooo', 'ooooooooooooo', '..ooooooooo..', LEGS_A],
  ['..ooooooooo..', '..okoooooko..', 'ooooooooooooo', 'ooooooooooooo', '..ooooooooo..', LEGS_B],
]

const TRIP: Sprite[] = [
  ['.z.....z.....', '..z...z......', '...o.o..o.o..', '...o.o..o.o..', '.ooooooooooo.', 'ookoooooookoo', '.ooooooooooo.'],
  ['..z...z......', '.z.....z.....', '...o.o..o.o..', '...o.o..o.o..', '.ooooooooooo.', 'ookoooooookoo', '.ooooooooooo.'],
]

const UMBRELLA: Sprite = ['...UUUUUUU...', '.UUUUUUUUUUU.', 'U.....s.....U']
const HEART: Sprite = ['q.q', '.q.']
const ZED: Sprite = ['ww', '.w', 'ww']
const BUG: Sprite[] = [
  ['.xx.', 'x.x.'],
  ['.xx.', '.x.x'],
]
const CLOUD: Sprite = ['..vvv...', '.vvvvvv.', 'vvvvvvvv']
const BOLT: Sprite = ['.l', 'l.', '.l']

/** Pixels the critter floats above the ground, per action and frame. */
function lift(action: Action, frame: number): number {
  if (action === 'fly') return 2 + (frame % 4 < 2 ? 1 : 0)
  if (action === 'cheer') return frame % 2 === 0 ? 1 : 0
  if (action === 'alert') return frame % 4 < 2 ? 2 : 0
  return 0
}

export function sprite(action: Action, frame: number): Sprite {
  const two = frame % 2
  switch (action) {
    case 'read':
      return READ[frame % 12 === 0 ? 1 : 0] ?? STAND
    case 'dig':
      return DIG[Math.floor(frame / 2) % 2] ?? STAND
    case 'fly':
      return FLY[two] ?? STAND
    case 'carry':
      return CARRY[two] ?? STAND
    case 'sneak':
      return SNEAK[Math.floor(frame / 2) % 2] ?? STAND
    case 'trip':
      return TRIP[Math.floor(frame / 3) % 2] ?? STAND
    case 'cheer':
      return CHEER
    case 'alert':
      return ALERT
    case 'sit':
      return SIT
    case 'yawn':
      return YAWN
    case 'sleep':
      return SLEEP
    case 'run':
      return two ? STRIDE : STAND
    default:
      return Math.floor(frame / 2) % 2 ? STRIDE : STAND
  }
}

/** Columns moved per tick: fractional speeds are spread over ticks. */
export function speed(action: Action): number {
  switch (action) {
    case 'run':
    case 'fly':
      return 1
    case 'walk':
    case 'carry':
      return 0.5
    case 'sneak':
      return 0.34
    default:
      return 0
  }
}

export const HERO_W = 17
export const STAGE_ROWS = 12 // pixel rows: 6 terminal lines
const GROUND = STAGE_ROWS - 1

type SceneDef = { ground: string; prop: Sprite; sky?: Sprite }

const SCENES: readonly SceneDef[] = [
  {
    ground: 'g',
    prop: ['..GGG..', '.GGGGG.', 'GGGGGGG', '.GGGGG.', 'GGGGGGG', '...T...', '...T...'],
  },
  {
    ground: 'S',
    prop: ['..C....', '..C.C..', 'C.C.C..', 'CCC.C..', '..CCC..', '..C....', '..C....'],
  },
  {
    ground: 'N',
    prop: ['...R...', '..RRR..', '.RRRRR.', '.HLHLH.', '.HHHHH.', '.HLHHH.', '.HHHHH.'],
    sky: ['.MM.', 'MMMM', '.MM.'],
  },
  {
    ground: 'W',
    prop: ['...P...', '..PPP..', '.PPPPP.', '..PPP..', '.PPPPP.', 'PPPPPPP', '...T...'],
  },
]

export const SCENE_COUNT = SCENES.length

const TINT: Record<Worker['tier'], string> = { opus: 'p', sonnet: 't', haiku: 'h', fable: 'f', other: 'e' }
export const TIER_COLOR: Record<Worker['tier'], string> = {
  opus: '#9b7fd4',
  sonnet: '#5fb8b0',
  haiku: '#8fcf6a',
  fable: '#e0b84c',
  other: '#8a8780',
}

export function tierOf(model: string | undefined): Worker['tier'] {
  const m = (model ?? '').toLowerCase()
  for (const t of ['opus', 'sonnet', 'haiku', 'fable'] as const) if (m.includes(t)) return t
  return 'other'
}

/** Context fill as weather: clear, clouds, rain, storm. */
export type Weather = 'clear' | 'clouds' | 'rain' | 'storm'
export function weatherOf(percent: number | null): Weather {
  if (percent === null || percent < 50) return 'clear'
  if (percent < 70) return 'clouds'
  if (percent < 85) return 'rain'
  return 'storm'
}

export type Extras = {
  weather: Weather
  bugs: number
  todos: { done: number; total: number } | null
}

const NONE: Extras = { weather: 'clear', bugs: 0, todos: null }

function paint(grid: string[][], art: Sprite, left: number, top: number, onlyEmpty = false) {
  art.forEach((row, y) => {
    const line = grid[top + y]
    if (!line) return
    for (let x = 0; x < row.length; x++) {
      const c = row[x]
      const at = left + x
      if (!c || c === '.' || at < 0 || at >= line.length) continue
      if (onlyEmpty && line[at] !== '.') continue
      line[at] = c
    }
  })
}

export function mirror(art: Sprite): Sprite {
  return art.map(r => r.padEnd(HERO_W, '.').split('').reverse().join(''))
}

function critter(grid: string[][], action: Action, x: number, dir: 1 | -1, frame: number, body?: string) {
  const raw = sprite(action, frame)
  const art = body ? raw.map(r => r.replaceAll('o', body)) : raw
  const drawn = dir < 0 ? mirror(art) : art
  const top = GROUND - drawn.length - lift(action, frame)
  paint(grid, drawn, Math.round(x), top)
  return top
}

/** The stage as pixel rows: weather, ground, scenery, pellets, bugs, helpers, then Claude on top. */
export function stage(hero: Hero, workers: readonly Worker[], frame: number, cols: number, extras: Extras = NONE): string[] {
  const grid = Array.from({ length: STAGE_ROWS }, () => Array<string>(cols).fill('.'))
  const def = SCENES[hero.scene % SCENES.length] ?? SCENES[0]
  if (!def) return grid.map(r => r.join(''))
  grid[GROUND] = Array<string>(cols).fill(def.ground)
  const wet = extras.weather
  if (def.sky && wet === 'clear') paint(grid, def.sky, cols - 8, 0)
  if (wet !== 'clear') {
    const drift = Math.floor(frame / 6)
    for (let x = 0; x < cols + 20; x += 20) paint(grid, CLOUD, ((x + drift) % (cols + 20)) - 10, 0)
  }
  for (let x = 4 + ((hero.scene * 7) % 11); x < cols - 7; x += 26) {
    paint(grid, def.prop, x, GROUND - def.prop.length)
  }

  // Todo pellets on the ground, right to left; the done ones are eaten.
  if (extras.todos && extras.todos.total > 0) {
    const left = extras.todos.total - extras.todos.done
    for (let n = 0; n < Math.min(left, 12); n++) paint(grid, ['Y'], cols - 3 - n * 3, GROUND - 1)
  }

  // Bugs from failing tests crawl along the ground.
  for (let n = 0; n < Math.min(extras.bugs, 8); n++) {
    const span = Math.max(1, cols - 6)
    const x = (n * 37 + Math.floor((frame + n * 5) / 3)) % span
    paint(grid, BUG[(frame + n) % 2] ?? [], x, GROUND - 2)
  }

  workers.forEach((w, n) => {
    const f = frame + n * 3 // out of step with each other
    const body = w.state === 'failed' ? 'e' : TINT[w.tier]
    const top = critter(grid, w.action, w.x, w.dir, f, body)
    if (w.state === 'done' || w.state === 'returning') {
      const rise = w.state === 'done' ? Math.floor(f / 3) % 2 : 0
      if (w.state === 'done') paint(grid, HEART, Math.round(w.x) + 5, Math.max(0, top - 2 - rise))
    }
  })

  const top = critter(grid, hero.action, hero.x, hero.dir, frame)
  if (wet === 'rain' || wet === 'storm') paint(grid, UMBRELLA, Math.round(hero.x), Math.max(0, top - 3))
  if (hero.action === 'sleep') {
    const zx = Math.round(hero.x) + 11 + (Math.floor(frame / 5) % 3)
    paint(grid, ZED, zx, Math.max(0, top - 3 - (Math.floor(frame / 5) % 2)))
  }
  if (hero.action === 'cheer' && workers.some(w => w.state === 'done')) {
    paint(grid, HEART, Math.round(hero.x) + 5, Math.max(0, top - 2))
  }

  // Rain falls through the empty sky; a storm adds a flash of lightning.
  if (wet === 'rain' || wet === 'storm') {
    for (let x = 1; x < cols; x += 4) {
      const y = 2 + ((frame + x * 7) % (GROUND - 2))
      paint(grid, ['j'], x, y, true)
    }
  }
  if (wet === 'storm' && frame % 40 < 3) paint(grid, BOLT, (frame * 13) % Math.max(1, cols - 2), 2, true)
  return grid.map(r => r.join(''))
}

export type Segment = { text: string; color?: string; backgroundColor?: string }

/** Two pixel rows into one line of half-block segments, adjacent styles merged. */
export function halfBlocks(top: string, bottom: string): Segment[] {
  const out: Segment[] = []
  for (let i = 0; i < top.length; i++) {
    const a = PALETTE[top[i] ?? '.']
    const b = PALETTE[bottom[i] ?? '.']
    let seg: Segment
    if (!a && !b) seg = { text: ' ' }
    else if (a && !b) seg = { text: '▀', color: a }
    else if (!a && b) seg = { text: '▄', color: b }
    else seg = { text: '▀', color: a, backgroundColor: b }
    const last = out[out.length - 1]
    if (last && last.color === seg.color && last.backgroundColor === seg.backgroundColor) last.text += seg.text
    else out.push(seg)
  }
  return out
}

export function lines(rows: readonly string[]): Segment[][] {
  const out: Segment[][] = []
  for (let y = 0; y < rows.length; y += 2) out.push(halfBlocks(rows[y] ?? '', rows[y + 1] ?? ''))
  return out
}

/** One-glyph stand-in for the critter when there is no room for the stage. */
const GLYPHS: Record<Action, readonly string[]> = {
  walk: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  run: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
  sneak: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●'],
  read: ['▤'],
  dig: ['▖', '▘', '▝', '▗'],
  fly: ['◜', '◝', '◞', '◟'],
  carry: ['▰▱▱', '▰▰▱', '▰▰▰'],
  trip: ['✗'],
  cheer: ['✓'],
  alert: ['!', ' '],
  sit: ['·'],
  yawn: ['○'],
  sleep: ['z', 'zz', 'zzz'],
}

export function glyph(action: Action, frame: number): string {
  const set = GLYPHS[action]
  return set[Math.floor(frame / 2) % set.length] ?? '·'
}
