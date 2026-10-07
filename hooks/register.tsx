import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Action, Emote, Face, Form, Fx, FxKind, Hat, Hero, Holiday, Limit, Stats, Theme, Worker } from '../types'
import { CONGA_AT, HERO_W, SCENE_COUNT, TIER_COLOR, glyph, lampsOf, lines, speed, stage, tierOf, weatherOf } from './art'
import type { Egg } from './story'
import {
  COMBO_AT,
  CROWN_AT,
  FORM_HAT,
  GROW_AT,
  ambushCaption,
  dungeonBeat,
  victoryCaption,
  NEW_STATS,
  REST,
  THINKING,
  bashEggs,
  beat,
  clockTime,
  countCall,
  eggBeat,
  eggDone,
  ending,
  endingAction,
  fidgetAt,
  fishing,
  formOf,
  growCaption,
  holidayOf,
  isLate,
  isMidnightNewYear,
  moodOf,
  notFound,
  readStats,
  restCaption,
  scarfColor,
  skyOf,
  startCaption,
  testCounts,
  tokenMilestone,
  tripCaption,
  waitBeat,
  warpColor,
} from './story'

const IDLE: Hero = { mode: 'idle', action: 'walk', caption: '', x: 0, dir: 1, scene: 0, steps: 0, since: 0 }

const hero = atom({ plugin: 'clawd-tales', key: 'hero' } as const, IDLE)
const workers = atom({ plugin: 'clawd-tales', key: 'workers' } as const, [])
const frame = atom({ plugin: 'clawd-tales', key: 'frame' } as const, 0)
const isOn = atom({ plugin: 'clawd-tales', key: 'isOn' } as const, true)
const alert = atom({ plugin: 'clawd-tales', key: 'alert' } as const, null)
const context = atom({ plugin: 'clawd-tales', key: 'context' } as const, null)
const limits = atom({ plugin: 'clawd-tales', key: 'limits' } as const, [])
const calm = atom({ plugin: 'clawd-tales', key: 'calm' } as const, false)
const bugs = atom({ plugin: 'clawd-tales', key: 'bugs' } as const, 0)
const todos = atom({ plugin: 'clawd-tales', key: 'todos' } as const, null)
const fx = atom({ plugin: 'clawd-tales', key: 'fx' } as const, [])
const shiny = atom({ plugin: 'clawd-tales', key: 'shiny' } as const, null)
const combo = atom({ plugin: 'clawd-tales', key: 'combo' } as const, 0)
const gold = atom({ plugin: 'clawd-tales', key: 'gold' } as const, 0)
const theme = atom({ plugin: 'clawd-tales', key: 'theme' } as const, 'meadow' as Theme)

const TICK_MS = 200
const CALM_TICK_MS = 1000 // calm mode: one beat a second
const POLL_EVERY = 5 // ticks between $.agent.list() checks
const THINK_AFTER_MS = 15000 // a helper with no tool call for this long wanders again
const TRIP_MS = 2500
const LINGER_MS = 8000 // the closing cheer lasts this long, then the rest ladder
const HUG_MS = 3000 // a helper that made it back stays this long with hearts
const RETURN_MAX_MS = 10_000 // a helper that can't reach Claude hands in anyway
const ENDED = new Set(['completed', 'failed', 'killed'])
const THINK_POSE_MS = 8000 // no tool call for this long mid-turn: a thought bubble
const MOOD_MS = 4000 // a blush or a sweat drop lasts this long
const VISITOR_ODDS = 1 / 25 // per prompt
const SHINY_ODDS = 1 / 100 // per session
const FX_MS: Record<FxKind, number> = { confetti: 2200, plane: 3500, boxes: 6000, train: 8000, whale: 16000, ufo: 10000, warp: 1200, coin: 900, coins: 1600, poof: 700 }
const HOLIDAYS: readonly Holiday[] = ['halloween', 'christmas', 'newyear', 'valentine', 'aprilfools']

// Module-level: a reload starts these over, and session.start picks the story back up.
let timer: Timer | undefined
let isCalm = false // mirrors the calm atom for the tick's own pacing
let isDungeon = false // mirrors the theme atom, for captions
let ticks = 0
let cols = 100
let heroCalls = 0 // main-loop tool calls still running: a trip waits for them to end
let tripUntil = 0
let startedAt = 0
let lastCallAt = 0 // the last main-loop tool call's end, for the thought bubble
let best = 0 // the turn's best combo
let fxId = 0
let holidayPick: Holiday | 'none' | null = null // /tales holiday: a preview, this load only
let alertAt: number | null = null // when the current call for the user began
let errStreak = 0 // main-loop errors in a row
let nextGlanceAt = 0
let planMode = false // the last prompt went in under plan mode: the wizard hat
let agentCalls = 0 // main-loop Agent calls still running: Claude is waiting on helpers
let sessionTokens = 0 // input, cache writes and output this session; cache reads left out
let tokensSeen = 0 // the count at the last main-loop ending, so a helper's crossing waits for it
const HARDHAT_MS = 120_000 // two minutes into a turn: hard hat on
const WAKE_MS = 60_000 // a minute before a limit resets, Claude stretches; a minute after, it's up
const TIE_AT = 3 // helpers out for the boss tie
const FAST_YES_MS = 6000 // approved and done this fast: hearts
const NERVOUS_MS = 30_000 // a call for the user waiting this long: a sweat drop and a timer
const FLIP_MS = 4000
let wornHat: Hat | null = null // /tales hat, saved in $.store
let wornFace: Face | null = null // /tales face, saved in $.store
const HATS_TO_WEAR: readonly Hat[] = ['tophat', 'gradcap', 'captain', 'wizard', 'hardhat', 'deerstalker', 'beanie', 'pith', 'shell', 'witch', 'santa', 'party', 'nightcap', 'crown']
let stats: Stats | null = null // lifetime progress from $.store; null until Clawd has hatched
let scarfOn = true // /tales scarf, saved in $.store
let scarfKey: string | null = null // the project's scarf color
const HATCH_MS = 2400
let demoGrowth: Form | 'shell' | null = null // /tales demo's own hatch and growth; real stats untouched
const FACES_TO_WEAR: readonly Face[] = ['glasses', 'shades', 'mustache']
const workerBeatAt = new Map<string, number>()
const workerTripUntil = new Map<string, number>()
const returningSince = new Map<string, number>()

/** Steps x along the stage, turning at either edge. */
function walk<T extends { x: number; dir: 1 | -1 }>(it: T, action: Action): T {
  const v = speed(action)
  if (v <= 0) return it
  const max = Math.max(0, cols - HERO_W)
  let x = it.x + v * it.dir
  let dir = it.dir
  if (x >= max) [x, dir] = [max, -1]
  if (x <= 0) [x, dir] = [0, 1]
  return { ...it, x, dir }
}

/** The rest ladder, by time since the turn's cheer ended. Null once Claude has gone. */
function restStep(since: number, now: number, lim: Limit | null, last?: Action): Pick<Hero, 'action' | 'caption' | 'emote'> | null {
  const resets = lim?.resetsAt ? Date.parse(lim.resetsAt) : NaN
  // The figure stays at 100 until the next response, so past the reset the clock decides.
  if (lim && lim.percent >= 100 && !(now >= resets + WAKE_MS)) {
    if (now >= resets) return { action: 'cheer', caption: `The ${lim.kind} limit has reset. Claude is up and ready!`, emote: null }
    if (now >= resets - WAKE_MS) return { action: 'stretch', caption: `Claude stretches. The ${lim.kind} limit resets at ${clockTime(lim.resetsAt)}.`, emote: null }
    return { action: 'sleep', caption: `Claude sleeps until the ${lim.kind} limit resets at ${clockTime(lim.resetsAt)}. z z z`, emote: null }
  }
  const t = now - since
  if (t >= REST.hideMs) return null
  const action = t < REST.sitMs ? 'sit' : t < REST.yawnMs ? 'yawn' : 'sleep'
  const fidget = action === 'sit' ? (fishing(t) ?? fidgetAt(t, Math.floor(since / 1000))) : null
  if (fidget) return { action: fidget.action, caption: fidget.caption, emote: fidget.emote ?? null }
  return { action, caption: restCaption(action, last, isDungeon), emote: null }
}

function holidayNow(d: Date): Holiday | null {
  if (holidayPick === 'none') return null
  return holidayPick ?? holidayOf(d)
}

/** Claude's eyes dart toward something for a moment. */
async function glanceAt($: EngineInterface, dir: -1 | 1, ms = 1500) {
  const now = await $.clock.now()
  await update($, hero, (cur): Hero => ({ ...cur, glance: dir, glanceUntil: now + ms }))
}

async function addFx($: EngineInterface, kind: FxKind, x: number) {
  if ((await read($, hero)).mode === 'idle') return
  const start = await $.clock.now()
  fxId += 1
  const one: Fx = { id: fxId, kind, start, dur: FX_MS[kind], x }
  await update($, fx, list => [...list.filter(f => f.kind !== kind), one])
  ensureTimer($)
}

/** A rare visitor crosses during the turn: a sky whale, a UFO, or the train. */
function maybeVisitor($: EngineInterface, force?: FxKind) {
  if (!force && Math.random() >= VISITOR_ODDS) return
  const kinds: FxKind[] = ['whale', 'ufo', 'train']
  const kind = force ?? kinds[Math.floor(Math.random() * kinds.length)] ?? 'whale'
  $.clock.after(force ? 0 : 3000 + Math.floor(Math.random() * 12000), () => void addFx($, kind, 0))
}

function ensureTimer($: EngineInterface) {
  if (timer) return
  timer = $.clock.every(isCalm ? CALM_TICK_MS : TICK_MS, async () => {
    ticks += 1
    const now = await $.clock.now()
    let cur = await read($, hero)
    const crew = await read($, workers)

    if (cur.mode === 'ending' && now - cur.since >= LINGER_MS) {
      cur = { ...cur, mode: 'resting', since: now, action: 'sit', caption: restCaption('sit', undefined, isDungeon) }
      await update($, hero, () => cur)
    }
    if (cur.emote && cur.mode !== 'resting' && cur.emote !== 'think' && now > (cur.emoteUntil ?? 0)) {
      cur = { ...cur, emote: null }
      await update($, hero, () => cur)
    }
    if (cur.mode === 'resting') {
      const step = restStep(cur.since, now, topLimit(await read($, limits)), cur.last)
      const next: Hero = step ? { ...cur, ...step } : { ...cur, mode: 'idle', emote: null }
      if (next.action !== cur.action || next.mode !== cur.mode || next.caption !== cur.caption || next.emote !== cur.emote) {
        cur = next
        await update($, hero, () => next)
        if (next.mode === 'idle') await update($, fx, () => [])
      }
    }
    let effects = await read($, fx)
    if (effects.some(f => now - f.start >= f.dur)) {
      effects = effects.filter(f => now - f.start < f.dur)
      await update($, fx, () => effects)
    }
    if (cur.mode === 'idle' && crew.length === 0 && effects.length === 0) {
      timer?.cancel()
      timer = undefined
      return
    }
    const f = (await read($, frame)) + 1
    await update($, frame, () => f)
    // Now and then the eyes wander: a look left or right for a second.
    if (cur.mode !== 'idle' && now >= nextGlanceAt) {
      if (nextGlanceAt > 0 && cur.action !== 'sleep') await glanceAt($, Math.random() < 0.5 ? -1 : 1, 1200)
      nextGlanceAt = now + 5000 + Math.floor(Math.random() * 7000)
    }

    if (cur.mode === 'working' && !(await read($, alert))) {
      let next: Hero = cur
      // Claude keeps the last pose through the model's thinking until the next tool call;
      // only a trip, once played, goes back to wandering.
      if ((cur.action === 'trip' || cur.action === 'dizzy' || cur.action === 'flip') && heroCalls === 0 && now >= tripUntil) {
        next = { ...next, action: 'walk', caption: THINKING[f % THINKING.length] ?? '' }
      }
      // A long think: the pose and caption stay, a thought bubble rises.
      if (!cur.emote && heroCalls === 0 && now - lastCallAt >= THINK_POSE_MS && next.action !== 'trip' && next.action !== 'sweep') {
        next = { ...next, emote: 'think', emoteUntil: Infinity }
      }
      // Waiting on an Agent call, Claude sits with the helpers' music or juggling: no wandering.
      if (!isCalm && agentCalls === 0) next = walk(next, next.action)
      if (next !== cur) await update($, hero, () => next)
    }

    if (crew.length > 0) {
      const homeX = cur.x
      const arrived: string[] = []
      await update($, workers, list =>
        list.map(w => {
          if (w.state === 'returning') {
            const gap = homeX - w.x
            const late = now - (returningSince.get(w.id) ?? now) > RETURN_MAX_MS
            if (Math.abs(gap) <= HERO_W - 4 || late) {
              arrived.push(w.id)
              return { ...w, state: 'done', action: w.sad ? 'sit' : 'cheer', dir: gap >= 0 ? 1 : -1 }
            }
            const dir: 1 | -1 = gap > 0 ? 1 : -1
            const step = Math.min(Math.abs(gap), isCalm ? 8 : 1)
            return { ...w, dir, x: w.x + dir * step }
          }
          if (w.state !== 'running') return w
          const quiet = now - (workerBeatAt.get(w.id) ?? 0) > THINK_AFTER_MS
          const tripping = now < (workerTripUntil.get(w.id) ?? 0)
          const action: Action = quiet && !tripping ? 'walk' : w.action
          return isCalm ? { ...w, action } : walk({ ...w, action }, action)
        }),
      )
      if (!isCalm) await update($, workers, conga)
      for (const id of arrived) $.clock.after(HUG_MS, () => void leave($, id))
      if (ticks % POLL_EVERY === 0) await settle($, crew)
    }
  })
}

/** Four or more helpers out: the ones wandering fall in line behind the first. */
function conga(list: Worker[]): Worker[] {
  const line = list.filter(w => w.state === 'running' && speed(w.action) > 0)
  if (list.filter(w => w.state === 'running').length < CONGA_AT || line.length < 2) return list
  const max = Math.max(0, cols - HERO_W)
  const placed = new Map<string, Worker>()
  let ahead = line[0]!
  for (const w of line.slice(1)) {
    const want = Math.min(max, Math.max(0, ahead.x - ahead.dir * 12))
    const gap = want - w.x
    const step = Math.min(Math.abs(gap), 1)
    const moved: Worker = { ...w, action: 'walk', x: w.x + Math.sign(gap) * step, dir: gap === 0 ? ahead.dir : gap > 0 ? 1 : -1 }
    placed.set(w.id, moved)
    ahead = moved
  }
  return list.map(w => placed.get(w.id) ?? w)
}

async function leave($: EngineInterface, id: string) {
  workerBeatAt.delete(id)
  workerTripUntil.delete(id)
  returningSince.delete(id)
  await update($, workers, list => list.filter(w => w.id !== id))
}

/** A helper ends: done ones run home to Claude, failed ones trip and leave. */
async function finish($: EngineInterface, id: string, state: 'done' | 'failed') {
  if (state === 'done') {
    returningSince.set(id, await $.clock.now())
    await update($, workers, list => list.map(w => (w.id === id ? { ...w, state: 'returning', action: 'run' } : w)))
    ensureTimer($)
    return
  }
  await update($, workers, list => list.map(w => (w.id === id ? { ...w, state: 'failed', action: 'trip', sad: true } : w)))
  // It trips, dusts off, and walks back to Claude for a pat on the head.
  $.clock.after(TRIP_MS, async () => {
    returningSince.set(id, await $.clock.now())
    await update($, workers, list => list.map(w => (w.id === id ? { ...w, state: 'returning', action: 'walk' } : w)))
  })
}

async function settle($: EngineInterface, list: readonly Worker[]) {
  const running = list.filter(w => w.state === 'running' && !w.id.startsWith('demo-'))
  if (running.length === 0) return
  const agents = await $.agent.list()
  for (const w of running) {
    const a = agents.find(x => x.id === w.id)
    if (!a) await finish($, w.id, 'done')
    else if (ENDED.has(a.status)) await finish($, w.id, a.status === 'completed' ? 'done' : 'failed')
  }
}

/** The spot on the stage farthest from Claude and every helper already out. */
function openSpot(taken: readonly number[], max: number): number {
  let best = 0
  let bestGap = -1
  for (let x = 0; x <= max; x += 2) {
    const gap = Math.min(...taken.map(t => Math.abs(t - x)), Infinity)
    if (gap > bestGap) [best, bestGap] = [x, gap]
  }
  return best
}

async function addWorker($: EngineInterface, id: string, label: string, model: string | undefined) {
  const max = Math.max(1, cols - HERO_W)
  const taken = [(await read($, hero)).x, ...(await read($, workers)).map(w => w.x)]
  const x = openSpot(taken, max)
  const w: Worker = {
    id,
    label,
    tier: tierOf(model),
    state: 'running',
    action: 'walk',
    x,
    dir: x > max / 2 ? -1 : 1,
    steps: 0,
  }
  workerBeatAt.set(id, await $.clock.now())
  await update($, workers, list => [...list.filter(x => x.id !== id), w])
  await glanceAt($, x >= taken[0]! ? 1 : -1)
  ensureTimer($)
}

async function workerBeat($: EngineInterface, id: string, action: Action, isError: boolean) {
  const now = await $.clock.now()
  workerBeatAt.set(id, now)
  if (isError) workerTripUntil.set(id, now + TRIP_MS)
  await update($, workers, list =>
    list.map(w => (w.id === id && w.state === 'running' ? { ...w, action, steps: w.steps + (isError ? 0 : 1) } : w)),
  )
}

/** A main-thread beat: action and caption, unless Claude is waiting on the user. */
const POSES = new Set<Action>(['read', 'dig', 'sneak', 'run', 'fly', 'carry', 'cover'])

async function heroBeat($: EngineInterface, b: Pick<Hero, 'action' | 'caption'>, step = 1, mood?: Emote) {
  const now = await $.clock.now()
  lastCallAt = now
  await update($, hero, (cur): Hero => {
    if (cur.mode !== 'working') return cur
    const emote = mood ?? (cur.emote === 'think' ? null : cur.emote)
    return {
      ...cur,
      ...b,
      steps: cur.steps + step,
      emote,
      emoteUntil: mood ? now + MOOD_MS : cur.emoteUntil,
      last: POSES.has(b.action) ? b.action : cur.last,
    }
  })
}

async function begin($: EngineInterface, text = '') {
  const now = await $.clock.now()
  const d = new Date(now)
  startedAt = now
  lastCallAt = now
  heroCalls = 0
  tripUntil = 0
  best = 0
  errStreak = 0
  alertAt = null
  const mood = moodOf(text)
  await update($, combo, () => 0)
  await update($, alert, () => null)
  await update($, hero, (cur): Hero => ({
    ...cur,
    mode: 'working',
    action: 'walk',
    caption: startCaption({ mood, woke: cur.action === 'sleep', holiday: holidayNow(d), hour: d.getHours(), dungeon: isDungeon }),
    scene: cur.mode === 'idle' ? (cur.scene + 1) % SCENE_COUNT : cur.scene,
    steps: 0,
    since: now,
    emote: mood === 'thanks' ? 'smitten' : mood === 'scold' ? 'sheepish' : null,
    emoteUntil: now + MOOD_MS,
    // Scolded, Claude can't quite look you in the eye.
    glance: mood === 'scold' ? -1 : cur.glance,
    glanceUntil: mood === 'scold' ? now + MOOD_MS : cur.glanceUntil,
  }))
  ensureTimer($)
}

async function close($: EngineInterface, caption: string, action: Action = 'cheer') {
  const now = await $.clock.now()
  await update($, alert, () => null)
  await update($, hero, (cur): Hero => ({ ...cur, mode: 'ending', action, caption, since: now, emote: null }))
  ensureTimer($)
}

/** An MCP call: a puff in the server's own color as Claude warps a message off. */
async function onMcp($: EngineInterface, tool: string) {
  const server = tool.split('__')[1] ?? tool
  const x = (await read($, hero)).x
  await addFx($, 'warp', x)
  await update($, fx, list => list.map(f => (f.kind === 'warp' && f.id === fxId ? { ...f, color: warpColor(server) } : f)))
}

/** Dungeon gold: a coin pops over Claude, a burst for a chest or a fight won. */
async function earn($: EngineInterface, n: number, burst = false) {
  if (!isDungeon || n <= 0) return
  await update($, gold, g => g + n)
  await addFx($, burst ? 'coins' : 'coin', (await read($, hero)).x)
}

/** The call as a beat, in the stage's own words. */
async function themed($: EngineInterface, tool: string, args: Record<string, unknown>, seed: string) {
  return isDungeon ? dungeonBeat(tool, args, seed, await read($, bugs)) : beat(tool, args, seed)
}

/** Test output: failures drop bugs into the scene, a green run lets Claude eat them. */
async function onTests($: EngineInterface, command: string, output: string, isMain: boolean) {
  const counts = testCounts(command, output)
  if (!counts) return
  const had = await read($, bugs)
  if (counts.failed > 0) {
    const n = Math.min(counts.failed, 8)
    await update($, bugs, () => n)
    const s = counts.failed === 1 ? '' : 's'
    const caption = isDungeon ? `${counts.failed} slime${s} ooze${s ? '' : 's'} out of the test run` : `${counts.failed} bug${s} crawl out of the test run`
    if (isMain) await heroBeat($, { action: 'trip', caption }, 0)
    tripUntil = (await $.clock.now()) + TRIP_MS
  } else if (counts.passed > 0 && had > 0) {
    const s = had === 1 ? '' : 's'
    const caption = isDungeon ? `Claude squashes ${had === 1 ? 'the slime' : `all ${had} slimes`}. Tests are green. +${had} gold` : `Claude eats all ${had} bug${s}. Tests are green.`
    if (isMain) await heroBeat($, { action: 'cheer', caption }, 0)
    if (isMain) await earn($, had, true)
    for (let n = 1; n <= had; n++) $.clock.after(n * 350, () => void update($, bugs, b => Math.max(0, b - 1)))
  }
}

/** TodoWrite: pending items are pellets; finishing one is a gobble. */
async function onTodos($: EngineInterface, input: Record<string, unknown>) {
  const list = Array.isArray(input.todos) ? (input.todos as Record<string, unknown>[]) : []
  if (list.length === 0) return
  const done = list.filter(t => t.status === 'completed')
  const prev = await read($, todos)
  const next = done.length === list.length ? null : { done: done.length, total: list.length }
  await update($, todos, () => next)
  if (prev && done.length > prev.done) {
    const last = done[done.length - 1]
    const what = typeof last?.content === 'string' ? last.content : 'a task'
    const caption = isDungeon
      ? next ? `Claude opens a treasure chest: ${what}` : 'Claude opens the last chest on the map!'
      : next ? `Claude gobbles a pellet: ${what}` : 'Claude clears the whole quest list!'
    await heroBeat($, { action: 'cheer', caption }, 0)
    await earn($, 3, true)
  }
}

/** Clean calls in a row: a combo from 5, a crown at 10. */
async function onCombo($: EngineInterface) {
  let n = 0
  await update($, combo, c => (n = c + 1))
  best = Math.max(best, n)
  if (n === CROWN_AT) await heroBeat($, { action: 'cheer', caption: `${CROWN_AT} clean calls in a row. Claude earns a crown!` }, 0)
}

/** A fun Bash command went through: confetti, a paper plane, boxes. */
async function onEggs($: EngineInterface, eggs: readonly Egg[], command: string) {
  const x = (await read($, hero)).x
  for (const egg of eggs) {
    if (egg === 'commit') await addFx($, 'confetti', x)
    if (egg === 'push') await addFx($, 'plane', x)
    if (egg === 'install') await addFx($, 'boxes', Math.min(Math.max(0, cols - 4), x + HERO_W))
  }
  const done = eggs.map(egg => eggDone(egg, command)).filter(Boolean)
  if (done.length > 0) await heroBeat($, { action: 'cheer', caption: done.join('. ') }, 0)
}

function readLimits(rates: readonly { kind: string; percentUsed: number; resetsAt?: string }[]): Limit[] {
  return rates.map(r => ({ kind: limitLabel(r.kind), percent: Math.round(r.percentUsed), resetsAt: r.resetsAt }))
}

/** 'five_hour' and friends as the short names people know. */
function limitLabel(kind: string): string {
  if (/five|5.?h/i.test(kind)) return '5h'
  if (/seven|7.?d|week/i.test(kind)) return '7d'
  return kind.replace(/_/g, ' ')
}

function topLimit(list: readonly Limit[]): Limit | null {
  let top: Limit | null = null
  for (const l of list) if (!top || l.percent > top.percent) top = l
  return top
}

/** Restarts the tick at the new pace. */
async function setCalm($: EngineInterface, on: boolean) {
  isCalm = on
  await update($, calm, () => on)
  timer?.cancel()
  timer = undefined
  const cur = await read($, hero)
  if (cur.mode !== 'idle' || (await read($, workers)).length > 0) ensureTimer($)
}

function runDemo($: EngineInterface) {
  const at = (ms: number, fn: () => Promise<unknown> | unknown) => $.clock.after(ms, () => void fn())
  const steps: [number, string, Record<string, unknown>][] = [
    [1500, 'Grep', { pattern: 'register' }],
    [4000, 'Read', { file_path: '/src/hooks/register.tsx' }],
    [6500, 'Agent', { description: 'Review the diff' }],
    [9000, 'Edit', { file_path: '/src/hooks/register.tsx' }],
    [15000, 'WebSearch', { query: 'half block pixel art' }],
  ]
  // It opens on an egg and ends with the hatchling growing up.
  demoGrowth = 'shell'
  at(0, async () => {
    const now = await $.clock.now()
    await update($, hero, (h): Hero => ({ ...h, action: 'hatch', caption: 'An egg wobbles…', since: now }))
  })
  at(1100, () => heroBeat($, { action: 'cheer', caption: 'A Clawd hatches! Hello!' }, 0))
  for (const [ms, tool, args] of steps) {
    at(ms, async () => {
      await heroBeat($, await themed($, tool, args, `demo${ms}`))
      await earn($, 1)
    })
  }
  at(2000, () => onTodos($, { todos: [1, 2, 3, 4, 5].map(n => ({ content: `Task ${n}`, status: n === 1 ? 'in_progress' : 'pending' })) }))
  at(3000, () => update($, context, () => 74)) // rain
  at(11000, () => heroBeat($, { action: 'run', caption: isDungeon ? 'Claude dashes down the hall to run the test suite' : 'Claude runs off to run the test suite' }))
  // The dungeon cut: with slimes on the floor, the next edit is a sword fight.
  at(13500, async () => {
    if (isDungeon) await heroBeat($, await themed($, 'Edit', { file_path: '/src/hooks/story.ts' }, 'demo13500'))
  })
  at(12000, () => onTests($, 'npm test', 'Tests: 3 failed, 9 passed', true))
  at(17500, () => update($, alert, () => 'Claude needs you: allow Bash(rm -rf build)?'))
  at(21000, () => update($, alert, () => null))
  at(21500, () => onTests($, 'npm test', 'Tests: 0 failed, 12 passed', true))
  at(23000, () => onTodos($, { todos: [1, 2, 3, 4, 5].map(n => ({ content: `Task ${n}`, status: n <= 3 ? 'completed' : 'pending' })) }))
  at(24000, () => update($, context, () => 90)) // storm
  const crew: [string, string, string, Action[], 'done' | 'failed'][] = [
    ['demo-1', 'Review the diff', 'claude-sonnet-5-5', ['read', 'sneak', 'read'], 'done'],
    ['demo-2', 'Judge the art', 'claude-opus-5-5', ['read', 'dig', 'run'], 'done'],
    ['demo-3', 'Scout old toys', 'claude-haiku-4-5', ['fly', 'fly', 'sneak'], 'failed'],
    ['demo-4', 'Write the fable', 'claude-fable-5-1', ['dig', 'read', 'dig'], 'done'],
  ]
  crew.forEach(([id, label, model, acts, end], n) => {
    const t = 7000 + n * 800
    at(t, () => addWorker($, id, label, model))
    acts.forEach((a, i) => at(t + 1500 + i * 2500, () => workerBeat($, id, a, false)))
    at(t + 1500 + acts.length * 2500 + n * 600, () => finish($, id, end))
  })
  at(16500, () => heroBeat($, beat('mcp__claude_ai_Gmail__search_threads', {}, 'demo16500')))
  at(16500, () => onMcp($, 'mcp__claude_ai_Gmail__search_threads'))
  at(24500, () => maybeVisitor($, 'whale'))
  at(25000, () => heroBeat($, eggBeat('commit', 'git commit -m "Teach Clawd new tricks"')))
  at(26000, async () => {
    await heroBeat($, { action: 'cheer', caption: eggDone('commit', 'git commit -m "Teach Clawd new tricks"') ?? '' }, 0)
    await addFx($, 'confetti', (await read($, hero)).x)
  })
  at(27000, () => update($, context, () => 30)) // the storm passes before the big moment
  at(28000, async () => {
    demoGrowth = 'explorer'
    await close($, growCaption('explorer', null))
    await addFx($, 'confetti', (await read($, hero)).x)
  })
  at(46000, () => (demoGrowth = null))
  at(40000, () => update($, todos, () => null)) // the fable's quest list leaves with it
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tales', description: 'Clawd tales: on, off, calm, lively, demo, theme, hat, face, scarf' })
    sessionTokens = 0
    tokensSeen = 0
    const hatSaved = await $.store.get('hat')
    wornHat = HATS_TO_WEAR.includes(hatSaved as Hat) ? (hatSaved as Hat) : null
    const faceSaved = await $.store.get('face')
    wornFace = FACES_TO_WEAR.includes(faceSaved as Face) ? (faceSaved as Face) : null
    stats = readStats(await $.store.get('stats'))
    scarfOn = (await $.store.get('scarf')) !== false
    isDungeon = (await $.store.get('theme')) === 'dungeon'
    await update($, theme, () => (isDungeon ? 'dungeon' : 'meadow'))
    try {
      scarfKey = scarfColor(await $.session.root())
    } catch {
      scarfKey = null
    }
    const saved = await $.store.get('isOn')
    if (typeof saved === 'boolean') await update($, isOn, () => saved)
    const savedCalm = await $.store.get('calm')
    isCalm = savedCalm === true
    await update($, calm, () => isCalm)
    try {
      const usage = await $.session.usage()
      await update($, context, () => usage.context.percent ?? null)
      await update($, limits, () => readLimits(usage.rateLimits))
    } catch {
      // No usage yet: the first measure fills it in.
    }
    if ((await read($, shiny)) === null) {
      const lucky = Math.random() < SHINY_ODDS
      await update($, shiny, () => lucky)
      if (lucky) await $.ui.toast('✨ A shiny Clawd appeared this session!')
    }
    if ((await read($, hero)).mode !== 'idle' || (await read($, workers)).length > 0) ensureTimer($)
    return next(e)
  })

  on('command.run', { command: 'tales' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'off' || arg === 'on') {
      await update($, isOn, () => arg === 'on')
      await $.store.set('isOn', arg === 'on')
      return { text: `Clawd tales ${arg}.` }
    }
    if (arg === 'calm' || arg === 'lively') {
      await setCalm($, arg === 'calm')
      await $.store.set('calm', arg === 'calm')
      return { text: arg === 'calm' ? 'Calm: one beat a second, Claude stays put between tool calls.' : 'Lively: 5 fps, wandering on.' }
    }
    const [word, name] = arg.split(/\s+/)
    // /tales theme dungeon|meadow, or just /tales dungeon.
    const pickTheme = word === 'theme' ? name : word === 'dungeon' || word === 'meadow' ? word : undefined
    if (word === 'theme' || pickTheme) {
      if (pickTheme !== 'dungeon' && pickTheme !== 'meadow') return { text: `The stage is the ${isDungeon ? 'dungeon' : 'meadow'}. Use /tales theme dungeon|meadow.` }
      isDungeon = pickTheme === 'dungeon'
      await update($, theme, () => pickTheme)
      await $.store.set('theme', pickTheme)
      return {
        text: isDungeon
          ? 'Into the dungeon: lamps for context, scrolls, treasure chests for tasks, gold for clean calls, monsters for failures.'
          : 'Back to the meadow.',
      }
    }
    if (word === 'scarf') {
      if (name !== 'on' && name !== 'off') return { text: `The scarf is ${scarfOn ? 'on' : 'off'}. Use /tales scarf on|off.` }
      scarfOn = name === 'on'
      await $.store.set('scarf', scarfOn)
      return { text: scarfOn ? 'Clawd wraps on the project scarf.' : 'Clawd takes off the scarf.' }
    }
    if (arg === 'demo') {
      await begin($)
      runDemo($)
      return { text: 'A short fable: helpers, bugs, pellets, weather and a call for you. About 45 seconds.' }
    }
    if (word === 'hat' || word === 'face') {
      const list: readonly string[] = word === 'hat' ? HATS_TO_WEAR : FACES_TO_WEAR
      if (name === 'none' || name === 'off') {
        if (word === 'hat') wornHat = null
        else wornFace = null
        await $.store.set(word, null)
        return { text: `Clawd takes off the ${word === 'hat' ? 'hat' : 'face gear'}.` }
      }
      if (!name || !list.includes(name)) return { text: `${word === 'hat' ? 'Hats' : 'Face'}: ${list.join(', ')}, none.` }
      if (word === 'hat') wornHat = name as Hat
      else wornFace = name as Face
      await $.store.set(word, name)
      return { text: `Clawd puts on the ${name}.` }
    }
    // Unlisted: preview a holiday look (this load only). "auto" goes back to the calendar.
    if (word === 'holiday') {
      if (name === 'auto') holidayPick = null
      else if (name === 'off') holidayPick = 'none'
      else if (HOLIDAYS.includes(name as Holiday)) holidayPick = name as Holiday
      else return { text: `Holidays: ${HOLIDAYS.join(', ')}, off, auto.` }
      return { text: `Holiday look: ${name}.` }
    }
    const mode = (await read($, calm)) ? 'calm' : 'lively'
    const sparkle = (await read($, shiny)) ? ' ✨ Shiny Clawd this session.' : ''
    const growth = !stats
      ? ' Clawd has not hatched yet.'
      : stats.form
        ? ` Clawd is a ${stats.form} (${stats.xp} tool calls).`
        : ` Clawd is a hatchling: ${stats.xp}/${GROW_AT} tool calls to grow up.`
    return {
      text: `Clawd tales is ${(await read($, isOn)) ? 'on' : 'off'} (${mode}) in the ${isDungeon ? 'dungeon' : 'meadow'}.${growth}${sparkle} Use /tales on|off|calm|lively|demo, /tales theme dungeon|meadow, /tales hat <name>, /tales face <name>, /tales scarf on|off.`,
    }
  })

  // Plan mode only shows on the classic hook's input; a mid-turn shift+tab waits for the next prompt.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    planMode = e.permission_mode === 'plan'
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await begin($, e.text)
    maybeVisitor($)
    return next(e)
  })

  // A turn without a typed prompt (a background agent's notice, a continuation) raises no
  // prompt.submit: without this Claude kept fishing and dozing through the whole turn.
  on('turn.start', async ($, e, next) => {
    if ((await read($, hero)).mode !== 'working') await begin($, e.text)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, context, () => e.context.percent ?? null)
    await update($, limits, () => readLimits(e.rateLimits))
    return next(e)
  })

  // A permission dialog is about to show (not just an "ask" verdict, which auto mode
  // may settle by itself): Claude jumps and waves until the call goes on.
  on('classic.PermissionRequest', async ($, e, next) => {
    const input = e.tool_input
    const cmd = typeof input === 'object' && input && 'command' in input ? String(input.command) : ''
    const what = cmd ? `${e.tool_name}(${cmd.length > 40 ? cmd.slice(0, 39) + '…' : cmd})` : e.tool_name
    alertAt = await $.clock.now()
    await update($, alert, () => `Claude needs you: allow ${what}?`)
    ensureTimer($)
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (!result.deny && result.agentId) await addWorker($, result.agentId, e.description || e.subagentType, result.model)
    return result
  })

  on('tool.call', async ($, e, next) => {
    const seed = e.tool_use_id ?? e.tool
    const args = e as unknown as Record<string, unknown>
    const owner = e.agentId
    const command = e.tool === 'Bash' && typeof args.command === 'string' ? args.command : ''
    const eggs = owner ? [] : bashEggs(command)
    const egg = eggs[0] ? eggBeat(eggs[0], command) : null
    const b = egg ?? (await themed($, e.tool, args, seed))
    const asks = e.tool === 'AskUserQuestion' || e.tool === 'ExitPlanMode'
    // A main-loop call means Claude is working, whatever the band missed.
    if (!owner && (await read($, hero)).mode !== 'working') await begin($)
    if (owner) await workerBeat($, owner, b.action, false)
    else {
      await heroBeat($, b, 1, egg?.emote)
      // No counting before the hatch: a mid-session install would skip the egg forever.
      // A sword fight counts as the work it interrupted.
      if (stats) stats = countCall(stats, b.action === 'fight' ? beat(e.tool, args, seed).action : b.action)
    }
    if (eggs.includes('sl')) await addFx($, 'train', 0)
    if (asks) {
      alertAt = await $.clock.now()
      await update($, alert, () => (e.tool === 'ExitPlanMode' ? 'Claude needs you: approve the plan?' : 'Claude needs you: a question is waiting'))
      ensureTimer($)
    }
    const delegates = !owner && e.tool === 'Agent'
    if (!owner && e.tool.startsWith('mcp__')) await onMcp($, e.tool)
    if (!owner) heroCalls += 1
    if (delegates) agentCalls += 1
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await next(e)
    } finally {
      if (!owner) {
        heroCalls = Math.max(0, heroCalls - 1)
        lastCallAt = await $.clock.now()
      }
      if (delegates) agentCalls = Math.max(0, agentCalls - 1)
    }
    if (e.tool === 'ExitPlanMode' && result.deny === undefined && !result.isError) planMode = false
    // Whatever it was waiting on, the call has gone ahead (or been refused).
    const waited = alertAt !== null && (await read($, alert)) ? (await $.clock.now()) - alertAt : null
    alertAt = null
    await update($, alert, () => null)
    if (waited !== null && waited < FAST_YES_MS && result.deny === undefined && !result.isError && !owner) {
      const now = await $.clock.now()
      await update($, hero, (cur): Hero => ({ ...cur, emote: 'blush', emoteUntil: now + 3000, caption: 'Claude beams at the quick yes' }))
    }
    if (result.deny !== undefined || result.isError) {
      if (owner) {
        await workerBeat($, owner, 'trip', true)
      } else {
        tripUntil = (await $.clock.now()) + TRIP_MS
        const missing = command && typeof result.text === 'string' ? notFound(result.text) : null
        errStreak += 1
        if (missing) {
          await heroBeat($, { action: 'trip', caption: `Choo choo! “${missing}” isn't a command` }, 0)
          await addFx($, 'train', 0)
        } else if (errStreak >= 3) {
          tripUntil = (await $.clock.now()) + FLIP_MS
          const caption = isDungeon ? ambushCaption(e.tool, errStreak, seed) : `(╯°□°)╯︵ ┻━┻  ${errStreak} stumbles in a row. Claude flips the table`
          await heroBeat($, { action: 'flip', caption }, 0)
        } else if (errStreak === 2) {
          tripUntil = (await $.clock.now()) + FLIP_MS
          await heroBeat($, { action: 'dizzy', caption: isDungeon ? ambushCaption(e.tool, 2, seed) : 'Claude sees stars: two stumbles in a row' }, 0)
        } else {
          await heroBeat($, { action: 'trip', caption: isDungeon ? ambushCaption(e.tool, 1, seed) : tripCaption(e.tool, seed) }, 0)
        }
        await update($, combo, () => 0)
      }
    } else if (!owner) {
      const beaten = errStreak
      errStreak = 0
      if (isDungeon && beaten > 0) {
        // The skeletons fall: a puff where they stood, and their coins.
        const h = await read($, hero)
        await addFx($, 'poof', h.dir > 0 ? h.x + HERO_W : h.x - 6)
        await heroBeat($, { action: 'cheer', caption: victoryCaption(beaten) }, 0)
        await earn($, beaten + 1, true)
      } else {
        await earn($, 1)
      }
      await onCombo($)
      if (eggs.length > 0) await onEggs($, eggs, command)
    }
    if (result.deny === undefined && e.tool === 'Bash' && typeof result.text === 'string') {
      await onTests($, typeof args.command === 'string' ? args.command : '', result.text, !owner)
    }
    if (e.tool === 'TodoWrite' && !owner) await onTodos($, args)
    return result
  })

  // Compaction: Claude sweeps the stage. Between turns it gets the band to itself, then rests.
  on('session.compact', async ($, e, next) => {
    if (e.trigger === 'precompute' || e.agentId) return next(e)
    const cur = await read($, hero)
    const solo = cur.mode !== 'working'
    if (solo) {
      const now = await $.clock.now()
      await update($, hero, (h): Hero => ({ ...h, mode: 'working', action: 'sweep', caption: isDungeon ? 'Claude sweeps the hall and refills the lamps…' : 'Claude sweeps up the old context…', since: now, emote: null }))
      ensureTimer($)
    } else {
      await heroBeat($, { action: 'sweep', caption: isDungeon ? 'Claude sweeps the hall and refills the lamps…' : 'Claude sweeps up the old context…' }, 0)
    }
    const result = await next(e)
    if (result.messages) {
      await update($, context, () => null) // the storm clears; the next measure says by how much
      if (solo) await close($, 'Squeaky clean. The stage is swept.')
      else await heroBeat($, { action: 'cheer', caption: 'Squeaky clean. Back to work.' }, 0)
    } else if (solo) {
      await update($, hero, (h): Hero => ({ ...h, mode: 'idle' }))
    }
    return result
  })

  // A session opens: a fresh one gets Clawd dropping in, a resumed one a wave hello.
  on('classic.SessionStart', async ($, e, next) => {
    const result = await next(e)
    // The very first session: an egg instead of the drop-in.
    const unhatched = e.source === 'startup' && !readStats(await $.store.get('stats'))
    if (unhatched && (await read($, hero)).mode === 'idle') {
      stats = stats ?? { ...NEW_STATS }
      await $.store.set('stats', stats)
      const now = await $.clock.now()
      await update($, hero, (h): Hero => ({ ...h, action: 'hatch', caption: 'An egg wobbles…', mode: 'ending', since: now, emote: null }))
      $.clock.after(HATCH_MS, async () => {
        const at = await $.clock.now()
        await update($, hero, (h): Hero => (h.action === 'hatch' ? { ...h, action: 'cheer', caption: 'A Clawd hatches! Hello!', since: at } : h))
      })
      ensureTimer($)
      return result
    }
    const entrance: Pick<Hero, 'action' | 'caption'> | null =
      e.source === 'startup'
        ? { action: 'drop', caption: 'Clawd drops in. Hello!' }
        : e.source === 'resume' || e.source === 'fork'
          ? { action: 'wave', caption: 'Welcome back! Clawd waves hello.' }
          : e.source === 'clear'
            ? { action: 'sweep', caption: 'A fresh start. Clawd sweeps the stage.' }
            : null
    if (entrance && (await read($, hero)).mode === 'idle') {
      const now = await $.clock.now()
      await update($, hero, (h): Hero => ({ ...h, ...entrance, mode: 'ending', since: now, emote: null }))
      ensureTimer($)
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u) sessionTokens += u.input_tokens + u.cache_creation_input_tokens + u.output_tokens
    // A helper's turn ends inside the main one: it counts toward tokens, not toward the ending.
    if (e.agentId) return next(e)
    const cur = await read($, hero)
    if (cur.mode === 'working') {
      const seconds = Math.round((e.durationMs ?? (await $.clock.now()) - startedAt) / 1000)
      const crossed = tokenMilestone(tokensSeen, sessionTokens)
      tokensSeen = sessionTokens
      const grown = stats ? formOf(stats) : null
      if (stats && grown && grown !== stats.form) {
        const was = stats.form
        stats = { ...stats, form: grown }
        await close($, growCaption(grown, was), 'cheer')
        await addFx($, 'confetti', cur.x)
      } else {
        await close($, ending(cur.steps, seconds, e.isAborted, best, crossed), endingAction(seconds, e.isAborted))
        if (crossed) await addFx($, 'confetti', cur.x)
      }
      if (stats) await $.store.set('stats', stats)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface === 'mobile' || e.props.hasSurvey) return next(e)
    const cur = await read($, hero)
    const crew = await read($, workers)
    const asking = await read($, alert)
    if ((cur.mode === 'idle' && crew.length === 0 && !asking) || !(await read($, isOn))) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    cols = Math.max(HERO_W + 4, e.props.bodyColumns ?? 80)
    const rows = e.props.maxRows ?? 12
    const f = await read($, frame)
    const out = crew.filter(w => w.state === 'running').length || crew.length
    const running = crew.filter(w => w.state === 'running')
    let shown: Hero = cur
    // Turn over, or the main loop blocked on an Agent call: Claude idles while the helpers work.
    if (cur.mode === 'idle' || (cur.mode === 'working' && agentCalls > 0 && running.length > 0)) {
      shown = { ...cur, ...waitBeat(out, running[0]?.label ?? crew[0]?.label) }
    }
    if (asking) {
      const waited = alertAt !== null ? Math.floor(((await $.clock.now()) - alertAt) / 1000) : 0
      const nervous = waited * 1000 >= NERVOUS_MS
      shown = { ...shown, action: 'alert', caption: nervous ? `${asking} (waiting ${waited}s)` : asking, emote: nervous ? 'sweat' : shown.emote }
    }
    const fit = (s: string, room: number) => (s.length > room ? s.slice(0, Math.max(1, room - 1)) + '…' : s)
    const caption = asking ? (
      <Text color="#e5534b" bold>
        {fit(shown.caption, cols)}
      </Text>
    ) : (
      <Text dimColor>{fit(shown.caption, cols)}</Text>
    )
    const below = await next(e)

    // Degradation ladder: full stage, then stage without sky or roster, then stage without its
    // caption (a fullscreen split pane leaves ~5 rows), then one line, then nothing. A call for
    // the person keeps its caption and gives up stage instead.
    if (rows < 1) return below
    const captionRows = asking || rows >= 6 ? 1 : 0
    const room = rows - captionRows
    if (room < 4 || cols < 30) {
      return (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text color={asking ? '#e5534b' : '#d77757'}>{`${glyph(shown.action, f)} `}</Text>
            {caption}
          </Box>
          {below}
        </Box>
      )
    }

    const task = await read($, todos)
    const now = await $.clock.now()
    const day = new Date(now)
    const holiday = holidayNow(day)
    const hour = day.getHours()
    const streak = await read($, combo)
    const holidayHat: Hat | null = holiday === 'halloween' ? 'witch' : holiday === 'christmas' ? 'santa' : holiday === 'newyear' ? 'party' : null
    const longHaul = cur.mode === 'working' && now - startedAt >= HARDHAT_MS
    const hat: Hat | null =
      streak >= CROWN_AT
        ? 'crown'
        : (wornHat ??
          (planMode ? 'wizard' : null) ??
          holidayHat ??
          (longHaul ? 'hardhat' : null) ??
          (isLate(hour) ? 'nightcap' : null) ??
          (demoGrowth === 'shell' ? 'shell' : demoGrowth ? FORM_HAT[demoGrowth] : null) ??
          (stats?.form ? FORM_HAT[stats.form] : stats ? 'shell' : null))
    const dungeon = (await read($, theme)) === 'dungeon'
    const coins = await read($, gold)
    const extras = {
      weather: dungeon ? ('clear' as const) : weatherOf(await read($, context)),
      dungeon,
      lamps: lampsOf(await read($, context)),
      foes: dungeon ? errStreak : 0,
      bugs: await read($, bugs),
      todos: task,
      now,
      sky: skyOf(hour),
      holiday,
      fireworks: holiday === 'newyear' && isMidnightNewYear(day),
      hat,
      shiny: (await read($, shiny)) === true,
      late: isLate(hour),
      fx: await read($, fx),
      // Earned the crown this turn: shades on, the cool kind.
      face: wornFace ?? (best >= CROWN_AT ? 'shades' : null),
      tie: running.length >= TIE_AT,
      scarf: scarfOn ? scarfKey : null,
    }
    const all = lines(stage(shown, crew, f, cols, extras))
    // Standing Claude reaches the second line; only the alert crop cuts into him.
    const stageLines = all.slice(rows >= 8 ? 0 : Math.min(2, Math.max(1, all.length - room)))
    const ctx = await read($, context)
    const gauges = [
      ...(ctx === null ? [] : [{ label: 'ctx', percent: Math.round(ctx) }]),
      ...(await read($, limits)).map(l => ({ label: l.kind, percent: l.percent })),
    ]
    const tone = (p: number) => (p >= 95 ? '#e5534b' : p >= 80 ? '#e0b84c' : undefined)
    const hasRoom = rows >= stageLines.length + captionRows + 1
    const roster =
      !hasRoom || (crew.length === 0 && !task && gauges.length === 0 && streak < COMBO_AT && !(dungeon && coins > 0)) ? null : (
        <Box flexDirection="row">
          {gauges.map((g, n) => (
            <Text color={tone(g.percent)} dimColor={!tone(g.percent)}>
              {`${n ? ' · ' : ''}${g.label} ${g.percent}%`}
            </Text>
          ))}
          {gauges.length > 0 && (task || crew.length > 0 || streak >= COMBO_AT || (dungeon && coins > 0)) ? <Text dimColor>{'   '}</Text> : null}
          {dungeon && coins > 0 ? <Text color="#f2d24b">{`◉ ${coins} gold  `}</Text> : null}
          {streak >= COMBO_AT ? <Text color="#e0b84c" bold>{`×${streak} combo${streak >= CROWN_AT ? ' 👑' : ''}  `}</Text> : null}
          {task ? <Text color="#f5d76e">{dungeon ? `▣ ${task.done}/${task.total} chests  ` : `● ${task.done}/${task.total} tasks  `}</Text> : null}
          {crew.slice(0, 4).map(w => (
            <Text color={TIER_COLOR[w.state === 'failed' ? 'other' : w.tier]}>
              {`${w.state === 'running' ? '●' : w.state === 'failed' ? '✗' : '✓'} ${fit(w.label, Math.max(8, Math.floor(cols / 5) - 3))}  `}
            </Text>
          ))}
          {crew.length > 4 ? <Text dimColor>{`+${crew.length - 4}`}</Text> : null}
        </Box>
      )
    return (
      <Box flexDirection="column">
        {stageLines.map(line => (
          <Box flexDirection="row">
            {line.map(s => (
              <Text color={s.color} backgroundColor={s.backgroundColor}>
                {s.text}
              </Text>
            ))}
          </Box>
        ))}
        {captionRows ? caption : null}
        {roster}
        {below}
      </Box>
    )
  })
}
