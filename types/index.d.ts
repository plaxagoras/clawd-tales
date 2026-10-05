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
    }
  }
}
