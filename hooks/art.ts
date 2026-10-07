/**
 * The stage, drawn with half blocks: each terminal cell is two pixels, the top
 * one the glyph's color and the bottom one its background.
 * Hero walk and cheer frames from Claude Fables (henrik-thevibe/Claude-Fables), MIT;
 * the other poses, the scenery, the weather and the critters are ours.
 */
import type { Action, Emote, Face, Fx, Hat, Hero, Holiday, Worker } from '../types'

const PALETTE: Record<string, string> = {
  o: '#d77757', // Clawd's body color in the Claude Code binary
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
  n: '#f2a6c8', // shiny Claude
  A: '#8d6cc4', // witch hat, bats
  O: '#e8892b', // pumpkin, dusk sun
  c: '#4fa3e0', // whale
  D: '#25232b', // dungeon brick
  K: '#35323d', // mortar
  E: '#3b312c', // lamplit brick
  J: '#4a3d33', // lamplit mortar
  F: '#3d3945', // flagstone
  Q: '#79c24a', // slime
}

type Sprite = readonly string[]

// 9 pixels wide, 5 tall: body columns 1-7, arms at 0 and 8, four legs.
const LEGS_A = '.o.o.o.o.'
const LEGS_B = '..o.o.o.o'

const HEAD = '.ooooooo.'
const EYES = '.okoooko.'
const ARMS = 'ooooooooo'
/** Clawd's eyes are tall bars: the second pixel sits in the arms row. */
const ARMS_EYES = 'ookoookoo'

const STAND: Sprite = [HEAD, EYES, ARMS_EYES, HEAD, LEGS_A]
const STRIDE: Sprite = [HEAD, EYES, ARMS_EYES, HEAD, LEGS_B]

/** Arms up, eyes squeezed into > < : Clawd's happy face. */
const CHEER: Sprite = ['o.......o', 'okoooooko', '.okoooko.', '.koooook.', LEGS_A]

/** Arms up and a red "!" beside the head: something needs the user. */
const ALERT: Sprite = ['o.......o.r', 'ooooooooo.r', '.okoooko..r', HEAD, '.o.o.o.o..r']

const SIT: Sprite = [HEAD, EYES, ARMS_EYES, HEAD]
const BLINK: Sprite = [HEAD, HEAD, ARMS, HEAD]
const YAWN: Sprite = [HEAD, '.kkoookk.', 'ooookoooo', HEAD]
const SLEEP: Sprite = ['..ooooo..', '.kkoookk.', ARMS]

/** Seated poses for the rest-time fidgets. */
const WAVE: Sprite[] = [
  ['.ooooooo.o', '.okoooko.o', 'ookoooko.', HEAD],
  ['.ooooooo..o', '.okoooko.o', 'ookoooko.', HEAD],
]
const SCRATCH: Sprite[] = [
  ['oooooooo.', EYES, '.okoookoo', HEAD],
  [HEAD, 'ookoooko.', '.okoookoo', HEAD],
]
const LOOK: Sprite[] = [
  [HEAD, '.koookoo.', 'okoookooo', HEAD],
  [HEAD, '.ookoook.', 'oookoooko', HEAD],
]
/** One eye shut to a dash. */
const WINK: Sprite = [HEAD, '.okooooo.', 'ookookkoo', HEAD]

/** Sitting with a rod out front; the line and water are drawn by the stage. */
const FISH: Sprite = ['.ooooooo...m', '.okoooko..m.', 'ookoookoos..', HEAD]
/** Rod bent up, eyes squeezed shut: something bit. */
const REEL: Sprite = ['.ooooooo.mm.', '.kkoookk.m..', 'ooooooooos..', HEAD]

/** Cross-eyed and wobbling after two stumbles in a row; stars circle the head. */
const DIZZY: Sprite[] = [
  [HEAD, '.ookokoo.', ARMS_EYES, HEAD, LEGS_A],
  [HEAD, '.ookokoo.', ARMS_EYES, HEAD, LEGS_B],
]
/** Arms up, brows down: three in a row. The table is drawn by the stage. */
const FLIP: Sprite = ['o.......o', 'ookoookoo', '.ookokoo.', HEAD, LEGS_A]
/** A broom out front, bristles swishing: compaction. */
const SWEEP: Sprite[] = [
  [HEAD, EYES, 'ookoookoos..', '.ooooooo..s.', '.o.o.o.o..yy'],
  [HEAD, EYES, 'ookoookoos..', '.ooooooo.s..', '.o.o.o.o.yy.'],
]

/** Paws over the eyes, knees knocking: rm -rf. */
const COVER: Sprite[] = [
  [HEAD, ARMS, HEAD, HEAD, LEGS_A],
  [HEAD, ARMS, HEAD, HEAD, '.oo...oo.'],
]

const READ: Sprite[] = [
  [HEAD, '.okoooko.BBb', 'ookoookoobBb', '.ooooooo.bbb', LEGS_A],
  [HEAD, '.ooooooo.BBb', 'ooooooooobbB', '.ooooooo.bbb', LEGS_A], // blink, page turns
]

const DIG: Sprite[] = [
  ['.ooooooo...m', '.okoooko..s.', 'ookoookoos..', HEAD, LEGS_A],
  ['.ooooooo.d.d', EYES, 'ookoookoos..', '.ooooooo..s.', '.o.o.o.o..mm'],
]

const FLY: Sprite[] = [
  ['w.......w', 'wooooooow', EYES, EYES, '..o...o..'],
  ['.........', HEAD, EYES, 'wokoookow', 'w.o...o.w'],
]

const CARRY_TOP: Sprite = ['.yyyyyyy.', 'oysyyysyo', 'ooooooooo', EYES, EYES]
const CARRY: Sprite[] = [
  [...CARRY_TOP, LEGS_A],
  [...CARRY_TOP, LEGS_B],
]

const SNEAK: Sprite[] = [
  [HEAD, EYES, ARMS_EYES, LEGS_A],
  [HEAD, EYES, ARMS_EYES, LEGS_B],
]

/** Flat on its back, legs up, stars circling. */
const TRIP: Sprite[] = [
  ['.z...z...', LEGS_A, HEAD, ARMS_EYES, '.okoooko.'],
  ['z.....z..', LEGS_B, HEAD, ARMS_EYES, '.okoooko.'],
]

/** A short turn ends on a content blink, no fuss. */
const NOD: Sprite[] = [STAND, [HEAD, HEAD, ARMS, HEAD, LEGS_A]]
/** A long turn: one arm up, then the other, feet shuffling. */
const DANCE: Sprite[] = [
  ['o........', 'okoooooko', '.okoooko.', '.koooook.', LEGS_A],
  ['........o', 'okoooooko', '.okoooko.', '.koooook.', LEGS_B],
]
/** A very long turn: a flag planted at the summit, flapping. */
const FLAG: Sprite[] = [
  ['.........srrr', '.ooooooo.srr.', '.okoooko.s...', 'ookoookoos...', '.ooooooo.s...', '.o.o.o.o.s'],
  ['.........srr.', '.ooooooo.srrr', '.okoooko.s...', 'ookoookoos...', '.ooooooo.s...', '.o.o.o.o.s'],
]
/** Seated, juggling while the helpers work: arms take turns. The balls are drawn by the stage. */
const JUGGLE: Sprite[] = [
  ['o........', 'oooooooo.', EYES, '.okoookoo', HEAD],
  ['........o', '.oooooooo', EYES, 'ookoooko.', HEAD],
]
/** Waking at the limit reset: arms high, eyes still shut. */
const STRETCH: Sprite[] = [
  ['o.......o', 'o.......o', HEAD, '.kkoookk.', HEAD, LEGS_A],
  ['o.......o', HEAD, '.kkoookk.', HEAD, LEGS_A],
]

/** First session ever: an egg rocks and cracks, and Clawd hatches out. */
const EGG: Sprite[] = [
  ['...WWW...', '..WWWWW..', '.WWWWkWW.', '.WWWkWWW.', '..WWWWW..'],
  ['..WWW....', '.WWWWW...', 'WWWWkWW..', 'WWWkWkWW.', '.WWWWW...'],
  ['...WWW...', '..WWWWW..', '.WWkWkWW.', '.WkWWWkW.', '..WWWWW..'],
  ['....WWW..', '...WWWWW.', '..WWkWWWW', '.WWkWkWWW', '...WWWWW.'],
]

/** Dungeon: a sword raised, then thrust at whatever is on the floor. */
const FIGHT: Sprite[] = [
  ['.ooooooo.m', '.okoooko.m', 'ookoookoos', HEAD, LEGS_A],
  [HEAD, EYES, 'ookoookoosmmm', HEAD, LEGS_B],
]
/** Dungeon: Claude pulls out a scroll instead of a book. */
const SCROLL: Sprite[] = [
  ['.ooooooo.sss', '.okoooko.BkB', 'ookoookooBBB', '.ooooooo.sss', LEGS_A],
  ['.ooooooo.sss', '.ooooooo.BkB', 'oooooooooBBB', '.ooooooo.sss', LEGS_A], // blink
]

const UMBRELLA: Sprite = ['..UUUUU..', '.UUUUUUU.', 'U...s...U']
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
  // Seated, Clawd breathes: a one-pixel bob, the official idle.
  if (action === 'sit' || action === 'wink' || action === 'fish') return Math.floor(frame / 4) % 2
  if (action === 'dance') return Math.floor(frame / 2) % 2
  // Nodding along to the music.
  if (action === 'listen') return Math.floor(frame / 3) % 2
  return 0
}

export function sprite(action: Action, frame: number, dungeon = false): Sprite {
  const two = frame % 2
  switch (action) {
    case 'read':
      return (dungeon ? SCROLL : READ)[frame % 12 === 0 ? 1 : 0] ?? STAND
    case 'fight':
      return FIGHT[Math.floor(frame / 2) % 2] ?? STAND
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
      return frame % 25 === 0 ? BLINK : SIT
    case 'yawn':
      return YAWN
    case 'sleep':
      return SLEEP
    case 'wave':
      return WAVE[Math.floor(frame / 2) % 2] ?? SIT
    case 'scratch':
      return SCRATCH[Math.floor(frame / 2) % 2] ?? SIT
    case 'look':
      return LOOK[Math.floor(frame / 5) % 2] ?? SIT
    case 'cover':
      return COVER[two] ?? STAND
    case 'dizzy':
      return DIZZY[Math.floor(frame / 2) % 2] ?? STAND
    case 'flip':
      return FLIP
    case 'sweep':
      return SWEEP[Math.floor(frame / 2) % 2] ?? STAND
    case 'drop':
      return CHEER
    case 'wink':
      return WINK
    case 'fish':
      return FISH
    case 'reel':
      return REEL
    case 'run':
      return two ? STRIDE : STAND
    case 'nod':
      return NOD[frame % 10 < 6 ? 0 : 1] ?? STAND
    case 'dance':
      return DANCE[Math.floor(frame / 2) % 2] ?? CHEER
    case 'flag':
      return FLAG[Math.floor(frame / 3) % 2] ?? STAND
    case 'listen':
      return frame % 16 < 4 ? BLINK : SIT
    case 'juggle':
      return JUGGLE[Math.floor(frame / 2) % 2] ?? SIT
    case 'stretch':
      return STRETCH[Math.floor(frame / 5) % 2] ?? STAND
    case 'hatch':
      return EGG[Math.floor(frame / 2) % EGG.length] ?? STAND
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

export const HERO_W = 13
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

/** The dungeon hallway's props, one per scene: a door, barrels, a portcullis, a bone pile. */
const DUNGEON_PROPS: readonly Sprite[] = [
  ['..eee..', '.eTTTe.', 'eTTTTTe', 'eTTTTTe', 'eTTTyTe', 'eTTTTTe', 'eTTTTTe'],
  ['.......', '.......', '.TTT...', 'TsssT..', 'TTTTT.T', 'TsssTTs', 'TTTTTTT'],
  ['mmmmmmm', 'm.m.m.m', 'm.m.m.m', 'mmmmmmm', 'm.m.m.m', 'm.m.m.m', 'm.m.m.m'],
  ['.......', '.......', '.......', '..WWW..', '.WkWkW.', 'WWWWWWW', 'WkWWWkW'],
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
/** Context fill as lamp oil, in the dungeon: 0 all bright, 1 burning low, 2 half out, 3 one lamp left. */
export function lampsOf(percent: number | null): 0 | 1 | 2 | 3 {
  if (percent === null || percent < 50) return 0
  if (percent < 70) return 1
  if (percent < 85) return 2
  return 3
}

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
  /** Clock ms, for effects; time of day and the holiday come from the caller. */
  now?: number
  sky?: 'day' | 'dusk' | 'night'
  holiday?: Holiday | null
  fireworks?: boolean
  hat?: Hat | null
  shiny?: boolean
  late?: boolean
  fx?: readonly Fx[]
  face?: Face | null
  /** Three or more helpers out: the boss tie. */
  tie?: boolean
  /** The project's scarf, a palette key; null with /tales scarf off. */
  scarf?: string | null
  /** The dungeon theme: a lamplit hallway instead of the meadow and its weather. */
  dungeon?: boolean
  /** Dungeon lamp level from lampsOf. */
  lamps?: 0 | 1 | 2 | 3
  /** Dungeon: skeletons squaring up to Claude after failed calls. */
  foes?: number
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

/** The eye rows, shifted one column to glance left (-1) or right (1). */
const GLANCES: readonly [string, string, string][] = [
  [EYES, '.koookoo.', '.ookoook.'],
  [ARMS_EYES, 'okoookooo', 'oookoooko'],
]
function glanced(rows: Sprite, look: -1 | 1): Sprite {
  return rows.map(r => {
    for (const [from, left, right] of GLANCES) if (r.includes(from)) return r.replace(from, look < 0 ? left : right)
    return r
  })
}

function critter(grid: string[][], action: Action, x: number, dir: 1 | -1, frame: number, body?: string, look?: -1 | 1 | null, rise = 0, dungeon = false) {
  const raw = sprite(action, frame, dungeon)
  const art = body ? raw.map(r => r.replaceAll('o', body)) : raw
  let drawn = dir < 0 ? mirror(art) : art
  if (look && !body) drawn = glanced(drawn, look)
  const top = GROUND - drawn.length - lift(action, frame) - rise
  paint(grid, drawn, Math.round(x), top)
  return top
}

const STARS: readonly [number, number][] = [[0, 0], [2, -1], [4, -1], [6, -1], [8, 0], [6, 1], [4, 1], [2, 1]]
const TABLE: Sprite[] = [
  ['sssss', 's...s'],
  ['s...s', 'sssss'],
]

/** Hats are the body's width (9), sitting on the pixel rows just above the head. */
const HATS: Record<Hat, Sprite> = {
  witch: ['....A....', '...AAA...', 'AAAzzzAAA'],
  santa: ['.....rW..', '..rrrr...', '.WWWWWWW.'],
  party: ['....z....', '...qbq...', '..bqbqb..'],
  nightcap: ['......bw.', '..bbbbb..', '.WWWWWWW.'],
  crown: ['.z.z.z.z.', '.zzzzzzz.'],
  tophat: ['..eeeee..', '..eeeee..', '..WWWWW..', '.eeeeeee.'],
  gradcap: ['eeeeeeeee', '..eeeeez.', '..eeeee.z'],
  captain: ['..WWWWW..', '.WWWzWWW.', 'eeeeeeeee'],
  wizard: ['....b....', '...bbb...', '..bbzbb..', 'bbbbbbbbb'],
  hardhat: ['...zzz...', '.zzzzzzz.', 'yyyyyyyyy'],
  shell: ['..W.W.W..', '..WWWWW..'],
  deerstalker: ['...TTT...', '.TTsTsTT.', 'TTTTTTTTT'],
  beanie: ['....W....', '..ggggg..', '.gGgGgGg.'],
  pith: ['..SSSSS..', '.SSSSSSS.', 'SSSSSSSSS'],
}

/** Face accessories, drawn from the eye row down. */
const FACES: Record<Face, Sprite> = {
  glasses: ['.kkk.kkk.', 'kkWkkkWkk'],
  shades: ['kkkkkkkkk', '.kkW.kkW.'],
  mustache: ['.........', '.........', '.kkk.kkk.'],
}
/** Which sprite row the eyes are on, per pose; poses without a usable face are left out. */
const EYE_ROW: Partial<Record<Action, number>> = {
  walk: 1, run: 1, read: 1, dig: 1, sneak: 1, sit: 1, wave: 1, scratch: 1, look: 1, wink: 1, fish: 1,
  cheer: 1, yawn: 1, alert: 2, fly: 2, carry: 3, nod: 1, dance: 1, flag: 2, listen: 1, juggle: 2, fight: 1,
}
/** Three or more helpers out: Claude is the boss, collar and tie under the eyes. */
const TIE: Sprite = ['...WrW...', '....r....']
/** Over each eye a heart, the notch filled in with the body color (B). */
const HEART_EYES: Sprite = ['.qBq.qBq.', '..q...q..']
/** Worried brows a row above the eyes: with the eyes glancing away they slant into a side-eye. */
const BROWS: Sprite = ['..k...k..']
const HEADPHONES: Sprite = ['..eeeee..', '.e.....e.', 'r.......r', 'r.......r']
const NOTE: Sprite = ['.qq', '.q.', 'qq.']
const BODY_W = 9

/** The thought bubble, dots filling in. */
function bubble(frame: number): Sprite {
  const dots = ['wkwwwww', 'wkwkwww', 'wkwkwkw'][Math.floor(frame / 3) % 3] ?? 'wkwkwkw'
  return ['.wwwww.', dots, '.wwwww.', 'w......']
}

const DREAM_ICONS: Partial<Record<Action, Sprite>> = {
  read: ['BBbBB', 'BBbBB', 'bbbbb'],
  dig: ['.m...', '..s..', '...s.'],
  fly: ['w...w', 'ww.ww', '.w.w.'],
  carry: ['yyyyy', 'ysyys', 'yyyyy'],
  sneak: ['.mm..', 'm..m.', '.mm.s'],
  run: ['..z..', '.zzz.', '..z..'],
  cover: ['..r..', '..r..', '..r..'],
}
function dream(last: Action | undefined): Sprite {
  const icon = (last && DREAM_ICONS[last]) || ['.q.q.', '.qqq.', '..q..']
  return ['.wwwwwww.', ...icon.map(r => `w.${r}.w`), '.wwwwwww.', '.w.......']
}

const BUTTERFLY: Sprite[] = [
  ['q.q', '.s.'],
  ['.q.', '.s.'],
]
const DROP: Sprite = ['j', 'j']
const BAT: Sprite[] = [
  ['A.A.A', '.AAA.'],
  ['.A.A.', 'AAAAA'],
]
const PUMPKIN: Sprite = ['..G..', '.OOO.', 'OLOLO', 'OOOOO', '.OOO.']
const SUN: Sprite = ['.zz.', 'zzzz', 'zzzz', '.zz.']
const DUSK_SUN: Sprite = ['.OO.', 'OOOO']
const MOON: Sprite = ['.MM.', 'MM..', 'MM..', '.MM.']
const MUG: Sprite[] = [
  ['.w.', 'w..', 'ss.', 'sss'],
  ['w..', '.w.', 'ss.', 'sss'],
]

const BOX: Sprite = ['yyy', 'ysy']
const PLANE: Sprite = ['w....', 'www..', '.wwww']
const WHALE: Sprite[] = [
  ['..........j.j', '...cccccc..j.', '.cccccccccc.c', 'ccwccccccccc.', '.BBBBBBBccc..'],
  ['...........j.', '...cccccc.j.j', '.cccccccccc..', 'ccwcccccccccc', '.BBBBBBBccc..'],
]
const UFO: Sprite[] = [
  ['...mmm...', '.mmmmmmm.', 'lmlmlmlml', '.mmmmmmm.'],
  ['...mmm...', '.mmmmmmm.', 'mlmlmlmlm', '.mmmmmmm.'],
]
const TRAIN_SMOKE: Sprite[] = [
  ['..ww', '.ww.'],
  ['.ww.', 'ww..'],
]
const TRAIN: Sprite = [
  '..ee..................................',
  '.eeeeeee.UUU..UUUUUUUUU.  UUUUUUUUU...',
  '.eeeeeeeeUUU..ULULULULU...ULULULULU...',
  'eeeeeeeeeeeee.UUUUUUUUU...UUUUUUUUU...',
  '.m.m...m.m.....m.....m.....m.....m....',
].map(r => r.replace(/ /g, '.'))
const CONFETTI = ['r', 'z', 't', 'q', 'b', 'h']
/** A gold coin, spinning edge-on and back. */
const COIN: Sprite[] = [['zz', 'Oz'], ['z', 'O'], ['zz', 'zO']]
/** Dungeon todos: one closed chest per pending item. */
const CHEST: Sprite = ['.TTT.', 'TyzyT', 'TTTTT']
/** Dungeon test failures: slimes squishing along the floor. */
const SLIME: Sprite[] = [
  ['.QQQ.', 'QkQkQ', 'QQQQQ'],
  ['.....', 'QkQkQ', 'QQQQQ'],
]
/** Dungeon tool errors: a skeleton with a club, facing Claude. */
const SKELETON: Sprite[] = [
  ['.WWW.', 'WkWkW', '.WWWs', 'WWWWs', '.W.W.'],
  ['.WWW.', 'WkWkW', '.WWW.', 'WWWWs', '.W.Ws'],
]
const LAMP_FLAME: Sprite[] = [
  ['.z.', 'zlz', '.O.'],
  ['z..', '.lz', '.O.'],
]
const LAMP_LOW: Sprite = ['...', '.z.', '.O.']
const LAMP_OUT: Sprite[] = [
  ['.v.', 'v..', '...'],
  ['v..', '.v.', '...'],
]
const SCONCE: Sprite = ['sss', '.s.']
const LAMP_TOP = 2

/** One effect at its age: where it is, drawn over the stage. */
function effect(grid: string[][], fx: Fx, now: number, frame: number, cols: number) {
  const age = Math.max(0, now - fx.start)
  const t = Math.min(1, age / fx.dur)
  switch (fx.kind) {
    case 'confetti':
      for (let n = 0; n < 14; n++) {
        // Bursts out over the head, then flutters down.
        const vx = ((n * 37) % 13) - 6
        const x = Math.round(fx.x + 4 + vx * (0.6 + t * 2.5))
        const y = Math.round(((n * 5) % 3) + 2 + t * t * 8)
        paint(grid, [CONFETTI[n % CONFETTI.length] ?? 'z'], x, y)
      }
      return
    case 'plane': {
      const x = Math.round(fx.x + 8 + t * (cols + 10))
      const y = Math.round(6 - t * 6 + Math.sin(t * 12) * 1.5)
      paint(grid, PLANE, x, y)
      return
    }
    case 'boxes':
      for (let n = 0; n < 3; n++) {
        const land = Math.min(1, Math.max(0, (age - n * 500) / 600))
        if (age < n * 500) continue
        const y = Math.round(land * (GROUND - 2 - n * 2))
        paint(grid, BOX, Math.round(fx.x), y)
      }
      return
    case 'train': {
      const x = Math.round(cols - t * (cols + TRAIN[0]!.length + 4))
      paint(grid, TRAIN, x, GROUND - TRAIN.length)
      paint(grid, TRAIN_SMOKE[frame % 2] ?? [], x + 1, GROUND - TRAIN.length - 2)
      return
    }
    case 'whale':
      paint(grid, WHALE[Math.floor(frame / 4) % 2] ?? [], Math.round(-14 + t * (cols + 16)), 0, true)
      return
    case 'ufo':
      paint(grid, UFO[frame % 2] ?? [], Math.round(cols - t * (cols + 10)), 0, true)
      return
    case 'coin': {
      // A coin pops up over Claude's head, spinning, and fades.
      const spin = COIN[Math.floor(frame / 2) % COIN.length] ?? []
      if (t < 0.85) paint(grid, spin, Math.round(fx.x + 4), Math.max(0, Math.round(3 - t * 3)))
      return
    }
    case 'coins':
      for (let n = 0; n < 6; n++) {
        // A burst arcs out from the chest or the slain monster and rains onto the floor.
        const vx = (n - 2.5) * 1.6
        const x = Math.round(fx.x + 4 + vx * (0.5 + t * 2))
        const y = Math.min(GROUND - 1, Math.round(4 - Math.sin(t * Math.PI) * 4 + t * 6))
        paint(grid, [(frame + n) % 3 === 0 ? 'O' : 'z'], x, y)
      }
      return
    case 'poof': {
      const r = 1 + t * 3
      for (let n = 0; n < 8; n++) {
        if (t > 0.5 && (n + frame) % 2 === 0) continue
        const a = (n / 8) * Math.PI * 2
        paint(grid, ['v'], Math.round(fx.x + 2 + Math.cos(a) * r * 1.6), Math.round(GROUND - 3 + Math.sin(a) * r * 0.7))
      }
      return
    }
    case 'warp': {
      // A ring of the server's color spreads from Claude and thins out.
      const r = 1 + t * 6
      const c = fx.color ?? 'p'
      for (let n = 0; n < 10; n++) {
        if (t > 0.6 && (n + frame) % 2 === 0) continue
        const a = (n / 10) * Math.PI * 2 + t
        paint(grid, [c], Math.round(fx.x + 4 + Math.cos(a) * r * 1.8), Math.round(GROUND - 4 + Math.sin(a) * r * 0.8), true)
      }
      return
    }
  }
}

/** Night stars, a sun or a moon, all behind the weather. */
function sky(grid: string[][], cols: number, frame: number, e: Extras, ownSky: boolean) {
  if (!e.sky) return
  if (e.sky === 'night') {
    for (let x = 3; x < cols; x += 9) {
      const y = (x * 7) % 4
      if ((frame + x) % 23 !== 0) paint(grid, ['W'], x, y)
    }
  }
  if (ownSky || e.weather !== 'clear') return
  const art = e.sky === 'day' ? SUN : e.sky === 'dusk' ? DUSK_SUN : MOON
  paint(grid, art, cols - 8, e.sky === 'dusk' ? 3 : 0)
}

function festive(grid: string[][], cols: number, frame: number, e: Extras) {
  switch (e.holiday) {
    case 'halloween':
      for (let n = 0; n < 2; n++) {
        const x = (Math.floor(frame / 2) + n * 40) % (cols + 10) - 5
        paint(grid, BAT[(frame + n) % 2] ?? [], x, 1 + n * 2 + (Math.floor(frame / 3) % 2), true)
      }
      paint(grid, PUMPKIN, 1, GROUND - PUMPKIN.length)
      return
    case 'valentine':
      for (let n = 0; n < 3; n++) {
        const y = 8 - (Math.floor(frame / 3) + n * 3) % 9
        paint(grid, HEART, (n * 31 + 7) % Math.max(1, cols - 3), y, true)
      }
      return
    default:
      return
  }
}

function fireworks(grid: string[][], cols: number, frame: number) {
  const burst = Math.floor(frame / 8)
  const age = frame % 8
  const x = (burst * 29) % Math.max(1, cols - 6) + 3
  const c = CONFETTI[burst % CONFETTI.length] ?? 'z'
  if (age < 2) paint(grid, [c], x, 5 - age * 2, true)
  else if (age < 6) {
    const r = age - 1
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const) {
      paint(grid, [c], x + dx * r, 2 + dy * Math.ceil(r / 2), true)
    }
  }
}

/** Snow at Christmas falls whatever the weather. */
function snow(grid: string[][], cols: number, frame: number) {
  for (let x = 2; x < cols; x += 5) {
    const y = (Math.floor(frame / 2) + x * 3) % GROUND
    paint(grid, ['W'], x + (Math.floor(frame / 4) + x) % 2, y, true)
  }
}

/** A sprite over the body, anchored like hats and face gear, flipped with Claude. */
function onBody(grid: string[][], art: Sprite, x: number, dir: 1 | -1, y: number) {
  paint(grid, dir > 0 ? art : art.map(r => r.padEnd(BODY_W, '.').split('').reverse().join('')), dir > 0 ? x : x + HERO_W - BODY_W, y)
}

function emote(grid: string[][], kind: Emote, x: number, dir: 1 | -1, top: number, frame: number, eyes?: number, body = 'o') {
  switch (kind) {
    case 'smitten':
      if (eyes !== undefined) onBody(grid, HEART_EYES.map(r => r.replaceAll('B', body)), x, dir, top + eyes)
      emote(grid, 'blush', x, dir, top, frame)
      return
    case 'sheepish':
      if (eyes !== undefined) onBody(grid, BROWS, x, dir, top + eyes - 1)
      emote(grid, 'sweat', x, dir, top, frame)
      return
    case 'think': {
      // Clear of a hat brim on the side Claude faces.
      const art = bubble(frame)
      paint(grid, dir > 0 ? art : art.map(r => r.split('').reverse().join('')), dir > 0 ? x + 10 : x - 4, top - 3)
      return
    }
    case 'blush':
      paint(grid, ['q'], x + (dir > 0 ? 1 : 5), top + 3)
      paint(grid, ['q'], x + (dir > 0 ? 7 : 11), top + 3)
      paint(grid, HEART, dir > 0 ? x + 9 : x + 1, top - 1 - (Math.floor(frame / 3) % 2))
      return
    case 'sweat':
      paint(grid, DROP, dir > 0 ? x + 8 : x + 4, top - 1 + (Math.floor(frame / 3) % 3))
      return
    case 'butterfly': {
      const bx = x + 4 + Math.round(Math.sin(frame / 3) * 6)
      const by = Math.max(0, top - 2 + Math.round(Math.cos(frame / 2)))
      paint(grid, BUTTERFLY[frame % 2] ?? [], bx, by)
      return
    }
  }
}

const FISHY: Sprite[] = [
  ['.c.', 'ccc', '.c.'],
  ['c..', 'ccc', '..c'],
]

/** The line from the rod tip to a puddle in front of Claude, a bobber, and on a bite a fish on the hook. */
function fishingLine(grid: string[][], action: Action, x: number, dir: 1 | -1, top: number, frame: number, cols: number) {
  // Sprite column c lands at x + c facing right, x + (HERO_W - 1 - c) mirrored.
  const at = (c: number) => (dir > 0 ? x + c : x + HERO_W - 1 - c)
  const pond = [13, 14, 15, 16, 17].map(at)
  for (const c of pond) {
    const row = grid[GROUND]
    if (row && c >= 0 && c < cols) row[c] = 'j'
  }
  const lineCol = at(15)
  if (action === 'fish') {
    paint(grid, ['m'], at(12), top - 1)
    paint(grid, ['m'], at(13), top - 1)
    paint(grid, ['m'], at(14), top)
    for (let y = top + 1; y < GROUND - 1; y++) paint(grid, ['m'], lineCol, y)
    paint(grid, ['r'], lineCol, GROUND - 1 - (Math.floor(frame / 4) % 2))
    return
  }
  // A bite: the line goes taut and a fish wriggles up out of the water.
  paint(grid, ['m'], at(11), top - 1)
  paint(grid, ['m'], at(12), top - 1)
  paint(grid, ['m'], at(12), top)
  const fish = FISHY[Math.floor(frame / 2) % 2] ?? []
  paint(grid, dir > 0 ? fish : fish.map(r => r.split('').reverse().join('')), at(12) - 1, Math.min(top + 1, GROUND - 3))
}

/** A scarf on the first body row under the eyes, its tail streaming out behind. */
function scarf(grid: string[][], rows: Sprite, color: string, x: number, dir: 1 | -1, top: number, eyes: number, frame: number) {
  // Past the eyes and the arms (a blink frame's arm row has no eyes in it).
  const arms = (r: string) => r[0] === 'o' && r[8] === 'o'
  let neck = eyes + 1
  while (neck < rows.length - 1 && ((rows[neck] ?? '').slice(1, 8).includes('k') || arms(rows[neck] ?? ''))) neck += 1
  // Under a box or wings the eyes sit low and only legs are left: no scarf.
  if (!/ooooo/.test(rows[neck] ?? '')) return
  // Sprite column c lands at x + c facing right, x + (HERO_W - 1 - c) mirrored.
  const at = (c: number) => (dir > 0 ? x + c : x + HERO_W - 1 - c)
  const put = (c: number, y: number) => paint(grid, [color], at(c), top + y)
  for (let c = 0; c <= 7; c++) put(c, neck)
  put(0, neck + 1)
  put(-1, neck + (frame % 6 < 3 ? 0 : 1)) // the tail flutters
}

const WALKING = new Set<Action>(['walk', 'run', 'sneak', 'carry'])

/** Running helpers line up behind each other: four or more make a conga. */
export const CONGA_AT = 4

/** The stage as pixel rows: sky, weather, ground, scenery, pellets, bugs, helpers, Claude, then effects. */
export function stage(hero: Hero, workers: readonly Worker[], frame: number, cols: number, extras: Extras = NONE): string[] {
  const grid = Array.from({ length: STAGE_ROWS }, () => Array<string>(cols).fill('.'))
  const def = SCENES[hero.scene % SCENES.length] ?? SCENES[0]
  if (!def) return grid.map(r => r.join(''))
  const dungeon = !!extras.dungeon
  // Underground there is no weather: context fill burns the lamp oil instead.
  const wet: Weather = dungeon ? 'clear' : extras.weather
  const lit: [number, number][] = []
  if (dungeon) {
    grid[GROUND] = Array.from({ length: cols }, (_, x) => (x % 7 === 0 ? 'K' : 'F'))
    const level = extras.lamps ?? 0
    const spots: number[] = []
    for (let x = 8 + ((hero.scene * 5) % 9); x < cols - 3; x += 22) spots.push(x)
    // At the last level only the lamp nearest Claude still burns.
    const nearest = spots.reduce((a, b) => (Math.abs(b - hero.x - 4) < Math.abs(a - hero.x - 4) ? b : a), spots[0] ?? 0)
    spots.forEach((x, n) => {
      const on = level < 2 || (level === 2 ? n % 2 === 0 : x === nearest && frame % 7 !== 0)
      paint(grid, SCONCE, x, LAMP_TOP + 3)
      if (!on) paint(grid, LAMP_OUT[Math.floor(frame / 4) % 2] ?? [], x, LAMP_TOP)
      else if (level === 0) paint(grid, LAMP_FLAME[Math.floor(frame / 3) % 2] ?? [], x, LAMP_TOP)
      else paint(grid, LAMP_LOW, x, LAMP_TOP)
      if (on) lit.push([x + 1, level === 0 ? 4 + (frame % 5 === 0 ? 0 : 1) : 3])
    })
  } else {
    grid[GROUND] = Array<string>(cols).fill(def.ground)
    sky(grid, cols, frame, extras, !!def.sky)
    if (def.sky && wet === 'clear') paint(grid, def.sky, cols - 8, 0)
  }
  if (wet !== 'clear') {
    const drift = Math.floor(frame / 6)
    for (let x = 0; x < cols + 20; x += 20) paint(grid, CLOUD, ((x + drift) % (cols + 20)) - 10, 0)
  }
  festive(grid, cols, frame, extras)
  if (extras.fireworks) fireworks(grid, cols, frame)
  const prop = dungeon ? (DUNGEON_PROPS[hero.scene % DUNGEON_PROPS.length] ?? def.prop) : def.prop
  for (let x = 4 + ((hero.scene * 7) % 11); x < cols - 7; x += 26) {
    paint(grid, prop, x, GROUND - prop.length)
  }

  // Todos on the ground, right to left: pellets in the meadow, treasure chests in the dungeon.
  if (extras.todos && extras.todos.total > 0) {
    const left = extras.todos.total - extras.todos.done
    if (dungeon) for (let n = 0; n < Math.min(left, 8); n++) paint(grid, CHEST, cols - 6 - n * 7, GROUND - CHEST.length)
    else for (let n = 0; n < Math.min(left, 12); n++) paint(grid, ['Y'], cols - 3 - n * 3, GROUND - 1)
  }

  // Failing tests: bugs crawl along the ground, or slimes squish along the dungeon floor.
  for (let n = 0; n < Math.min(extras.bugs, 8); n++) {
    const span = Math.max(1, cols - 6)
    const x = (n * 37 + Math.floor((frame + n * 5) / (dungeon ? 5 : 3))) % span
    if (dungeon) paint(grid, SLIME[Math.floor((frame + n * 3) / 3) % 2] ?? [], x, GROUND - 3)
    else paint(grid, BUG[(frame + n) % 2] ?? [], x, GROUND - 2)
  }

  // Failed calls in the dungeon: skeletons line up in front of Claude, clubs toward it.
  if (dungeon && extras.foes) {
    for (let n = 0; n < Math.min(extras.foes, 3); n++) {
      const art = SKELETON[Math.floor((frame + n * 2) / 3) % 2] ?? []
      const ahead = hero.dir > 0 ? Math.round(hero.x) + HERO_W + n * 6 : Math.round(hero.x) - 6 - n * 6
      paint(grid, hero.dir > 0 ? art.map(r => r.split('').reverse().join('')) : art, ahead, GROUND - art.length)
    }
  }

  const now = extras.now ?? 0
  const fx = extras.fx ?? []
  for (const f of fx) if (f.kind === 'boxes') effect(grid, f, now, frame, cols)

  workers.forEach((w, n) => {
    const f = frame + n * 3 // out of step with each other
    const body = w.state === 'failed' || w.sad ? 'e' : TINT[w.tier]
    const top = critter(grid, w.action, w.x, w.dir, f, body, null, 0, !!extras.dungeon)
    if (w.state === 'done' && w.sad) {
      // Claude's paw pats the head of a helper that didn't make it.
      paint(grid, ['ooo'], Math.round(w.x) + 3, Math.max(0, top - 1 - (Math.floor(f / 2) % 2)))
      paint(grid, HEART, Math.round(w.x) + 8, Math.max(0, top - 2))
    } else if (w.state === 'done') {
      const rise = Math.floor(f / 3) % 2
      paint(grid, HEART, Math.round(w.x) + 3, Math.max(0, top - 2 - rise))
    }
  })

  // April 1st: Claude walks backwards.
  const face: 1 | -1 = extras.holiday === 'aprilfools' && WALKING.has(hero.action) ? (hero.dir > 0 ? -1 : 1) : hero.dir
  const x = Math.round(hero.x)
  // Dropping in: falls from the sky over the first ~0.7 s, then a puff on landing.
  const dropAge = hero.action === 'drop' ? Math.max(0, now - hero.since) : Infinity
  const fall = Math.max(0, Math.round(12 - dropAge / 60))
  // Heart eyes stay put; any other time the eyes may wander.
  const glance = hero.glance && now < (hero.glanceUntil ?? 0) && hero.emote !== 'smitten' ? hero.glance : null
  const top = critter(grid, hero.action, hero.x, face, frame, extras.shiny ? 'n' : undefined, glance, fall, dungeon)
  if (hero.action === 'drop' && fall === 0 && dropAge < 1100) {
    paint(grid, ['w', '.w'], x - 2, GROUND - 2)
    paint(grid, ['.w', 'w'], x + 9, GROUND - 2)
  }
  if (hero.action === 'dizzy') {
    for (let n = 0; n < 2; n++) {
      const [dx, dy] = STARS[(Math.floor(frame / 2) + n * 4) % STARS.length] ?? [0, 0]
      paint(grid, ['z'], x + dx, Math.max(0, top - 2 + dy))
    }
  }
  if (hero.action === 'flip') {
    const k = frame % 10
    const tx = face > 0 ? x + 8 + k : x + 4 - k - 5
    paint(grid, TABLE[Math.floor(frame / 2) % 2] ?? [], tx, Math.max(0, top - 1 - Math.floor(k / 2)))
  }
  if (hero.action === 'sweep' && frame % 4 < 2) {
    paint(grid, ['v.v'], face > 0 ? x + 12 + (frame % 3) : x - 4 - (frame % 3), GROUND - 2 - (frame % 2), true)
  }
  if (extras.shiny && frame % 6 < 3) {
    paint(grid, ['z'], x + ((frame * 5) % 10), Math.max(0, top - 1))
    paint(grid, ['W'], x + ((frame * 11 + 7) % 10), top + 2)
  }
  const wearsHat = extras.hat && hero.action !== 'trip' && hero.action !== 'hatch' && !(wet === 'rain' || wet === 'storm')
  if (wearsHat && extras.hat) {
    const hat = HATS[extras.hat]
    paint(grid, face > 0 ? hat : hat.map(r => r.split('').reverse().join('')), face > 0 ? x : x + HERO_W - BODY_W, top - hat.length)
  }
  const wear = extras.face ? FACES[extras.face] : null
  const eyes = EYE_ROW[hero.action]
  if (wear && eyes !== undefined) {
    paint(grid, face > 0 ? wear : wear.map(r => r.split('').reverse().join('')), face > 0 ? x : x + HERO_W - BODY_W, top + eyes)
  }
  if (extras.scarf && eyes !== undefined) scarf(grid, sprite(hero.action, frame, dungeon), extras.scarf, x, face, top, eyes, frame)
  if (extras.tie && eyes !== undefined) onBody(grid, TIE, x, face, top + eyes + 1)
  if (hero.action === 'listen') paint(grid, HEADPHONES, x, top - 2)
  if ((hero.action === 'listen' || hero.action === 'dance') && frame % 12 < 8) {
    paint(grid, NOTE, face > 0 ? x + 10 : x - 3, Math.max(0, top - 2 - (Math.floor(frame / 4) % 2)), true)
  }
  if (hero.action === 'juggle') {
    // One ball per helper out, in its tint, on an arc over Claude's head.
    const balls = workers.filter(w => w.state === 'running').slice(0, 4)
    const n = Math.max(2, balls.length)
    for (let i = 0; i < n; i++) {
      const a = frame * 0.45 + (i * Math.PI * 2) / n
      const tint = balls[i] ? TINT[balls[i]!.tier] : 'z'
      paint(grid, [tint], Math.round(x + 4 + Math.cos(a) * 5), Math.max(0, Math.round(top - 2 - Math.abs(Math.sin(a)) * 3)))
    }
  }
  if (hero.action === 'fish' || hero.action === 'reel') fishingLine(grid, hero.action, x, face, top, frame, cols)
  if (wet === 'rain' || wet === 'storm') paint(grid, UMBRELLA, x, Math.max(0, top - 3))
  if (hero.action === 'sleep') {
    if (Math.floor(frame / 15) % 2 === 1) {
      paint(grid, dream(hero.last), x + 7, Math.max(0, top - 7))
    } else {
      const zx = x + 8 + (Math.floor(frame / 5) % 3)
      paint(grid, ZED, zx, Math.max(0, top - 3 - (Math.floor(frame / 5) % 2)))
    }
  }
  if (extras.late && (hero.action === 'sit' || hero.action === 'look' || hero.action === 'scratch' || hero.action === 'wave')) {
    paint(grid, MUG[Math.floor(frame / 3) % 2] ?? [], face > 0 ? x + 10 : x - 1, GROUND - 4)
  }
  if (hero.emote) emote(grid, hero.emote, x, face, top, frame, eyes, extras.shiny ? 'n' : 'o')
  if (hero.action === 'cheer' && workers.some(w => w.state === 'done')) {
    paint(grid, HEART, x + 3, Math.max(0, top - 2))
  }
  for (const f of fx) if (f.kind !== 'boxes') effect(grid, f, now, frame, cols)

  // Rain falls through the empty sky; a storm adds a flash of lightning.
  if (wet === 'rain' || wet === 'storm') {
    for (let x = 1; x < cols; x += 4) {
      const y = 2 + ((frame + x * 7) % (GROUND - 2))
      paint(grid, ['j'], x, y, true)
    }
  }
  if (extras.holiday === 'christmas' && !dungeon) snow(grid, cols, frame)
  if (wet === 'storm' && frame % 40 < 3) paint(grid, BOLT, (frame * 13) % Math.max(1, cols - 2), 2, true)
  if (dungeon) bricks(grid, lit)
  return grid.map(r => r.join(''))
}

/** The hallway wall behind everything: bricks in every empty pixel, warm near a burning lamp. */
function bricks(grid: string[][], lit: readonly [number, number][]) {
  for (let y = 0; y < GROUND; y++) {
    const row = grid[y]
    if (!row) continue
    const course = Math.floor(y / 3)
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') continue
      const mortar = y % 3 === 2 || (x + (course % 2) * 4) % 8 === 0
      // Full warmth near the flame, a dithered rim further out.
      const d = Math.min(...lit.map(([lx, r]) => ((x - lx) / (r * 1.8)) ** 2 + ((y - LAMP_TOP - 1) / r) ** 2), Infinity)
      const warm = d <= 0.45 || (d <= 1 && (x + y) % 2 === 0)
      row[x] = warm ? (mortar ? 'J' : 'E') : mortar ? 'K' : 'D'
    }
  }
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
  wave: ['~', '≈'],
  scratch: ['#'],
  look: ['◂', '▸'],
  cover: ['◡', '◠'],
  dizzy: ['@', '◎'],
  flip: ['┻━┻'],
  sweep: ['⌇'],
  drop: ['↓', '✓'],
  wink: [';'],
  fish: ['⌐', '¬'],
  reel: ['><>'],
  nod: ['·', '˙'],
  dance: ['♪', '♫'],
  flag: ['⚑'],
  listen: ['♪'],
  juggle: ['∘°', '°∘'],
  stretch: ['\\o/'],
  hatch: ['◯', '◔', '◑', '◕'],
  fight: ['⚔', '†'],
}

export function glyph(action: Action, frame: number): string {
  const set = GLYPHS[action]
  return set[Math.floor(frame / 2) % set.length] ?? '·'
}
