import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Action, Hero, Limit, Worker } from '../types'
import { HERO_W, SCENE_COUNT, TIER_COLOR, glyph, lines, speed, stage, tierOf, weatherOf } from './art'
import { REST, THINKING, beat, clockTime, ending, restCaption, testCounts, tripCaption } from './story'

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

const TICK_MS = 200
const CALM_TICK_MS = 1000 // calm mode: one beat a second
const POLL_EVERY = 5 // ticks between $.agent.list() checks
const THINK_AFTER_MS = 15000 // a helper with no tool call for this long wanders again
const TRIP_MS = 2500
const LINGER_MS = 8000 // the closing cheer lasts this long, then the rest ladder
const HUG_MS = 3000 // a helper that made it back stays this long with hearts
const RETURN_MAX_MS = 10_000 // a helper that can't reach Claude hands in anyway
const ENDED = new Set(['completed', 'failed', 'killed'])

// Module-level: a reload starts these over, and session.start picks the story back up.
let timer: Timer | undefined
let isCalm = false // mirrors the calm atom for the tick's own pacing
let ticks = 0
let cols = 100
let heroCalls = 0 // main-loop tool calls still running: a trip waits for them to end
let tripUntil = 0
let startedAt = 0
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
function restStep(since: number, now: number, lim: Limit | null): Pick<Hero, 'action' | 'caption'> | null {
  if (lim && lim.percent >= 100) {
    return { action: 'sleep', caption: `Claude sleeps until the ${lim.kind} limit resets at ${clockTime(lim.resetsAt)}. z z z` }
  }
  const t = now - since
  if (t >= REST.hideMs) return null
  const action = t < REST.sitMs ? 'sit' : t < REST.yawnMs ? 'yawn' : 'sleep'
  return { action, caption: restCaption(action) }
}

function ensureTimer($: EngineInterface) {
  if (timer) return
  timer = $.clock.every(isCalm ? CALM_TICK_MS : TICK_MS, async () => {
    ticks += 1
    const now = await $.clock.now()
    let cur = await read($, hero)
    const crew = await read($, workers)

    if (cur.mode === 'ending' && now - cur.since >= LINGER_MS) {
      cur = { ...cur, mode: 'resting', since: now, action: 'sit', caption: restCaption('sit') }
      await update($, hero, () => cur)
    }
    if (cur.mode === 'resting') {
      const step = restStep(cur.since, now, topLimit(await read($, limits)))
      const next: Hero = step ? { ...cur, ...step } : { ...cur, mode: 'idle' }
      if (next.action !== cur.action || next.mode !== cur.mode || next.caption !== cur.caption) {
        cur = next
        await update($, hero, () => next)
      }
    }
    if (cur.mode === 'idle' && crew.length === 0) {
      timer?.cancel()
      timer = undefined
      return
    }
    const f = (await read($, frame)) + 1
    await update($, frame, () => f)

    if (cur.mode === 'working' && !(await read($, alert))) {
      let next: Hero = cur
      // Claude keeps the last pose through the model's thinking until the next tool call;
      // only a trip, once played, goes back to wandering.
      if (cur.action === 'trip' && heroCalls === 0 && now >= tripUntil) {
        next = { ...next, action: 'walk', caption: THINKING[f % THINKING.length] ?? '' }
      }
      if (!isCalm) next = walk(next, next.action)
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
              return { ...w, state: 'done', action: 'cheer', dir: gap >= 0 ? 1 : -1 }
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
      for (const id of arrived) $.clock.after(HUG_MS, () => void leave($, id))
      if (ticks % POLL_EVERY === 0) await settle($, crew)
    }
  })
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
  await update($, workers, list => list.map(w => (w.id === id ? { ...w, state: 'failed', action: 'trip' } : w)))
  $.clock.after(HUG_MS, () => void leave($, id))
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
async function heroBeat($: EngineInterface, b: Pick<Hero, 'action' | 'caption'>, step = 1) {
  await update($, hero, (cur): Hero => (cur.mode === 'working' ? { ...cur, ...b, steps: cur.steps + step } : cur))
}

async function begin($: EngineInterface) {
  const now = await $.clock.now()
  startedAt = now
  heroCalls = 0
  tripUntil = 0
  await update($, alert, () => null)
  await update($, hero, (cur): Hero => ({
    ...cur,
    mode: 'working',
    action: 'walk',
    caption: cur.action === 'sleep' ? 'Claude wakes with a start and sets out…' : 'Once upon a prompt, Claude set out…',
    scene: cur.mode === 'idle' ? (cur.scene + 1) % SCENE_COUNT : cur.scene,
    steps: 0,
    since: now,
  }))
  ensureTimer($)
}

async function close($: EngineInterface, caption: string) {
  const now = await $.clock.now()
  await update($, alert, () => null)
  await update($, hero, (cur): Hero => ({ ...cur, mode: 'ending', action: 'cheer', caption, since: now }))
  ensureTimer($)
}

/** Test output: failures drop bugs into the scene, a green run lets Claude eat them. */
async function onTests($: EngineInterface, command: string, output: string, isMain: boolean) {
  const counts = testCounts(command, output)
  if (!counts) return
  const had = await read($, bugs)
  if (counts.failed > 0) {
    const n = Math.min(counts.failed, 8)
    await update($, bugs, () => n)
    if (isMain) await heroBeat($, { action: 'trip', caption: `${counts.failed} bug${counts.failed === 1 ? '' : 's'} crawl out of the test run` }, 0)
    tripUntil = (await $.clock.now()) + TRIP_MS
  } else if (counts.passed > 0 && had > 0) {
    if (isMain) await heroBeat($, { action: 'cheer', caption: `Claude eats all ${had} bug${had === 1 ? '' : 's'}. Tests are green.` }, 0)
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
    await heroBeat($, { action: 'cheer', caption: next ? `Claude gobbles a pellet: ${what}` : 'Claude clears the whole quest list!' }, 0)
  }
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
  for (const [ms, tool, args] of steps) at(ms, () => heroBeat($, beat(tool, args, `demo${ms}`)))
  at(2000, () => onTodos($, { todos: [1, 2, 3, 4, 5].map(n => ({ content: `Task ${n}`, status: n === 1 ? 'in_progress' : 'pending' })) }))
  at(3000, () => update($, context, () => 74)) // rain
  at(11000, () => heroBeat($, { action: 'run', caption: 'Claude runs off to run the test suite' }))
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
  at(28000, () => close($, ending(9, 28, false)))
  at(40000, () => update($, context, () => 30))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tales', description: 'Clawd tales: on, off, calm, lively, or demo' })
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
    if (arg === 'demo') {
      await begin($)
      runDemo($)
      return { text: 'A short fable: helpers, bugs, pellets, weather and a call for you. About 45 seconds.' }
    }
    const mode = (await read($, calm)) ? 'calm' : 'lively'
    return { text: `Clawd tales is ${(await read($, isOn)) ? 'on' : 'off'} (${mode}). Use /tales on|off|calm|lively|demo.` }
  })

  on('prompt.submit', async ($, e, next) => {
    await begin($)
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
    const b = beat(e.tool, args, seed)
    const owner = e.agentId
    const asks = e.tool === 'AskUserQuestion' || e.tool === 'ExitPlanMode'
    if (owner) await workerBeat($, owner, b.action, false)
    else await heroBeat($, b)
    if (asks) {
      await update($, alert, () => (e.tool === 'ExitPlanMode' ? 'Claude needs you: approve the plan?' : 'Claude needs you: a question is waiting'))
      ensureTimer($)
    }
    if (!owner) heroCalls += 1
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await next(e)
    } finally {
      if (!owner) {
        heroCalls = Math.max(0, heroCalls - 1)
      }
    }
    // Whatever it was waiting on, the call has gone ahead (or been refused).
    await update($, alert, () => null)
    if (result.deny !== undefined || result.isError) {
      if (owner) {
        await workerBeat($, owner, 'trip', true)
      } else {
        tripUntil = (await $.clock.now()) + TRIP_MS
        await heroBeat($, { action: 'trip', caption: tripCaption(e.tool, seed) }, 0)
      }
    }
    if (result.deny === undefined && e.tool === 'Bash' && typeof result.text === 'string') {
      await onTests($, typeof args.command === 'string' ? args.command : '', result.text, !owner)
    }
    if (e.tool === 'TodoWrite' && !owner) await onTodos($, args)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const cur = await read($, hero)
    if (cur.mode === 'working') {
      const seconds = Math.round(((await $.clock.now()) - startedAt) / 1000)
      await close($, ending(cur.steps, seconds, e.isAborted))
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
    let shown: Hero = cur
    // Turn over, helpers still out: Claude sits and reads while they work.
    if (cur.mode === 'idle') shown = { ...cur, action: 'read', caption: `Claude waits on ${out} helper${out === 1 ? '' : 's'}…` }
    if (asking) shown = { ...shown, action: 'alert', caption: asking }
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
            <Text color={asking ? '#e5534b' : '#d97757'}>{`${glyph(shown.action, f)} `}</Text>
            {caption}
          </Box>
          {below}
        </Box>
      )
    }

    const task = await read($, todos)
    const extras = { weather: weatherOf(await read($, context)), bugs: await read($, bugs), todos: task }
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
      !hasRoom || (crew.length === 0 && !task && gauges.length === 0) ? null : (
        <Box flexDirection="row">
          {gauges.map((g, n) => (
            <Text color={tone(g.percent)} dimColor={!tone(g.percent)}>
              {`${n ? ' · ' : ''}${g.label} ${g.percent}%`}
            </Text>
          ))}
          {gauges.length > 0 && (task || crew.length > 0) ? <Text dimColor>{'   '}</Text> : null}
          {task ? <Text color="#f5d76e">{`● ${task.done}/${task.total} tasks  `}</Text> : null}
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
