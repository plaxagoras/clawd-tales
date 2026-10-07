export type Action =
  | 'walk'
  | 'run'
  | 'sneak'
  | 'read'
  | 'dig'
  | 'fly'
  | 'carry'
  | 'trip'
  | 'cheer'
  | 'alert'
  | 'sit'
  | 'yawn'
  | 'sleep'
  | 'wave'
  | 'scratch'
  | 'look'
  | 'cover'
  | 'wink'
  | 'fish'
  | 'reel'
  | 'dizzy'
  | 'flip'
  | 'sweep'
  | 'drop'
  | 'nod'
  | 'dance'
  | 'flag'
  | 'listen'
  | 'juggle'
  | 'stretch'
  | 'hatch'
  /** Dungeon theme: a sword swing while monsters are on the floor. */
  | 'fight'
  /** Dungeon theme: a wand raised for a shell command. */
  | 'cast'

/**
 * A small overlay on Claude: thought bubble, blush, sweat drop, a visiting butterfly;
 * smitten adds heart eyes to the blush, sheepish adds worried brows to the sweat.
 */
export type Emote = 'think' | 'blush' | 'sweat' | 'butterfly' | 'smitten' | 'sheepish'

/** Timed effects that cross or burst over the stage. */
export type FxKind = 'confetti' | 'plane' | 'boxes' | 'train' | 'whale' | 'ufo' | 'warp' | 'coin' | 'coins' | 'poof'
/** color: a palette key, for effects tinted per source (an MCP server's warp). */
export type Fx = { id: number; kind: FxKind; start: number; dur: number; x: number; color?: string }

/** The stage: the meadow with its weather, or a lamplit dungeon hallway. */
export type Theme = 'meadow' | 'dungeon'

export type Holiday = 'halloween' | 'christmas' | 'newyear' | 'valentine' | 'aprilfools'
export type Hat =
  | 'witch'
  | 'santa'
  | 'party'
  | 'nightcap'
  | 'crown'
  | 'tophat'
  | 'gradcap'
  | 'captain'
  | 'wizard'
  | 'hardhat'
  | 'shell'
  | 'deerstalker'
  | 'beanie'
  | 'pith'
/** What Clawd grows into after GROW_AT tool calls, from the work it does most. */
export type Form = 'scholar' | 'detective' | 'builder' | 'hacker' | 'explorer' | 'captain'
/** Lifetime progress, saved in $.store: tool calls in all, per form, and the form it grew into. */
export type Stats = { xp: number; by: Partial<Record<Form, number>>; form: Form | null }
/** Worn over the face: /tales face. */
export type Face = 'glasses' | 'shades' | 'mustache'

export type Hero = {
  /** idle draws nothing; resting is the sit, yawn, sleep ladder after a turn. */
  mode: 'idle' | 'working' | 'ending' | 'resting'
  action: Action
  caption: string
  x: number
  dir: 1 | -1
  scene: number
  steps: number
  /** When the current mode began (clock ms), for the rest ladder. */
  since: number
  emote?: Emote | null
  /** Clock ms the emote ends; Infinity holds it until the next tool call. */
  emoteUntil?: number
  /** The last tool pose, which Claude dreams about. */
  last?: Action
  /** Eyes glancing left or right until glanceUntil (clock ms). */
  glance?: -1 | 1 | null
  glanceUntil?: number
}

/** A spawned subagent, drawn as a tinted critter in the same scene. */
export type Worker = {
  id: string
  label: string
  tier: 'opus' | 'sonnet' | 'haiku' | 'fable' | 'other'
  /** returning: done, running back to Claude to hand in the result. */
  state: 'running' | 'returning' | 'done' | 'failed'
  action: Action
  x: number
  dir: 1 | -1
  steps: number
  /** Failed, then walked back to Claude for a pat on the head. */
  sad?: boolean
}

export type Limit = { kind: string; percent: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'clawd-tales': {
      hero: Hero
      workers: Worker[]
      frame: number
      isOn: boolean
      /** What Claude is waiting on the user for, or null. */
      alert: string | null
      /** Context fill 0-100, or null before the first measure. */
      context: number | null
      /** Plan rate-limit windows (5h, 7d), as last measured. */
      limits: Limit[]
      /** Calm mode: one frame a second, no wandering. */
      calm: boolean
      bugs: number
      todos: { done: number; total: number } | null
      fx: Fx[]
      /** Rolled once a session: null until then. */
      shiny: boolean | null
      /** Clean main-loop tool calls in a row this turn. */
      combo: number
      /** Dungeon theme: gold coins earned this session. */
      gold: number
      theme: Theme
    }
  }
}
