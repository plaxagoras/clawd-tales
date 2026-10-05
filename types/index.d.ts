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

/** A small overlay on Claude: thought bubble, blush, sweat drop, a visiting butterfly. */
export type Emote = 'think' | 'blush' | 'sweat' | 'butterfly'

/** Timed effects that cross or burst over the stage. */
export type FxKind = 'confetti' | 'plane' | 'boxes' | 'train' | 'whale' | 'ufo'
export type Fx = { id: number; kind: FxKind; start: number; dur: number; x: number }

export type Holiday = 'halloween' | 'christmas' | 'newyear' | 'valentine' | 'aprilfools'
export type Hat = 'witch' | 'santa' | 'party' | 'nightcap' | 'crown' | 'tophat' | 'gradcap' | 'captain'
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
    }
  }
}
