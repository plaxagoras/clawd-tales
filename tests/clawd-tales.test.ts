import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { HERO_W, STAGE_ROWS, glyph, lines, mirror, sprite, stage, tierOf, weatherOf } from '../hooks/art'
import { beat, ending, testCounts } from '../hooks/story'

function world(on: On) {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'engine band' }))
  return clock
}

const PROPS = { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} }
const BAND = { plugin: 'clawd-tales', component: 'AbovePrompt', props: PROPS } as const

const HERO = { mode: 'working', action: 'walk', caption: '', x: 10, dir: 1, scene: 0, steps: 0, since: 0 } as const
const ACTIONS = ['walk', 'run', 'sneak', 'read', 'dig', 'fly', 'carry', 'trip', 'cheer', 'alert', 'sit', 'yawn', 'sleep'] as const

test('each tool call becomes an action and a caption', () => {
  expect(beat('Read', { file_path: '/a/b/art.ts' }, 's').action).toBe('read')
  expect(beat('Read', { file_path: '/a/b/art.ts' }, 's').caption).toMatch(/art\.ts/)
  expect(beat('Edit', { file_path: '/x.ts' }, 's').action).toBe('dig')
  expect(beat('Grep', { pattern: 'foo' }, 's').caption).toMatch(/foo/)
  expect(beat('Bash', { description: 'Run tests' }, 's').action).toBe('run')
  expect(beat('AskUserQuestion', {}, 's').action).toBe('alert')
  expect(beat('mcp__claude_ai_Gmail__search_threads', {}, 's').caption).toMatch(/Gmail/)
  expect(ending(3, 12, false)).toBe('The end · 3 steps · 12s')
})

test('test output becomes bug counts', () => {
  expect(testCounts('npm test', 'Tests: 3 failed, 9 passed')).toEqual({ failed: 3, passed: 9 })
  expect(testCounts('claude plugin test .', ' 5 pass\n 0 fail')).toEqual({ failed: 0, passed: 5 })
  expect(testCounts('cargo test', 'test result: FAILED. 3 passed; 1 failed')).toEqual({ failed: 1, passed: 3 })
  expect(testCounts('ls -la', '3 failed')).toBe(null)
  expect(testCounts('pytest', 'collected nothing')).toBe(null)
})

test('context fill is weather', () => {
  expect(weatherOf(null)).toBe('clear')
  expect(weatherOf(60)).toBe('clouds')
  expect(weatherOf(74)).toBe('rain')
  expect(weatherOf(90)).toBe('storm')
})

test('helpers are tinted by model and share the stage', () => {
  expect(tierOf('claude-fable-5-1')).toBe('fable')
  expect(tierOf('claude-haiku-4-5-20251001')).toBe('haiku')
  const w = { id: 'w', label: 'x', tier: 'opus', state: 'running', action: 'walk', x: 30, dir: 1, steps: 0 } as const
  const rows = stage({ ...HERO, x: 0 }, [w], 0, 60)
  expect(rows.some(r => r.includes('p'))).toBe(true) // Opus purple
  expect(rows.some(r => r.includes('o'))).toBe(true) // main Claude orange
  const done = stage({ ...HERO, x: 0, action: 'cheer' }, [{ ...w, state: 'done', action: 'cheer' }], 0, 60)
  expect(done.some(r => r.includes('q'))).toBe(true) // hearts
})

test('bugs, pellets, rain and the alert all draw', () => {
  const rows = stage({ ...HERO, action: 'alert' }, [], 0, 80, { weather: 'storm', bugs: 3, todos: { done: 1, total: 4 } })
  const all = rows.join('')
  for (const key of ['x', 'Y', 'j', 'U', 'r', 'v']) expect(all.includes(key)).toBe(true)
})

test('every pose fits, mirrors, and has a one-line glyph', () => {
  const rows = stage({ ...HERO }, [], 0, 60)
  expect(rows.length).toBe(STAGE_ROWS)
  expect(rows.every(r => r.length === 60)).toBe(true)
  expect(lines(rows).length).toBe(6)
  for (const a of ACTIONS) {
    expect(glyph(a, 3).length > 0).toBe(true)
    for (const f of [0, 1, 2, 3]) {
      const s = sprite(a, f)
      expect(s.every(r => r.length <= HERO_W)).toBe(true)
      expect(mirror(s).every(r => r.length === HERO_W)).toBe(true)
    }
  }
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the demo runs every beat, then rests, then leaves (${surface})`, async ($, on) => {
    const clock = world(on)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const see = async (text: RegExp | string, props = PROPS) => {
      const band = await $.ui.mount({ ...BAND, props, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }

    expect(await see('engine band')).toBeDefined()
    await $.command.run({ command: 'tales', args: 'demo', origin: { kind: 'composer' }, presentation: 'command' } as never)

    await clock.advance(5000)
    expect(await see(/Claude .*register\.tsx/)).toBeDefined()
    expect(await see('engine band')).toBeDefined()
    expect(await see(/0\/5 tasks/)).toBeDefined()

    await clock.advance(5000) // 10 s
    expect(await see(/Review the diff/)).toBeDefined()

    await clock.advance(2500) // 12.5 s
    expect(await see(/3 bugs crawl/)).toBeDefined()

    await clock.advance(6000) // 18.5 s
    expect(await see(/Claude needs you/)).toBeDefined()
    // Short band: one line, still says what it needs.
    expect(await see(/Claude needs you/, { ...PROPS, maxRows: 3 })).toBeDefined()

    await clock.advance(5000) // 23.5 s
    expect(await see(/3\/5 tasks/)).toBeDefined()

    await clock.advance(6000) // 29.5 s
    expect(await see(/The end/)).toBeDefined()

    await clock.advance(10000) // 39.5 s: resting
    expect(await see(/sits by the path/)).toBeDefined()

    await clock.advance(30000) // 69.5 s
    expect(await see(/dozes/)).toBeDefined()

    await clock.advance(200000)
    expect(await see('engine band')).toBeDefined()
    expect(await see(/dozes|sits|The end/)).toBe(undefined)
  })

  test(`Claude holds a pose through a slow tool and a long think (${surface})`, async ($, on) => {
    const clock = world(on)
    let release = () => {}
    on('prompt.submit', (_, e) => e as never)
    on('tool.call', () => new Promise(r => (release = () => r({ result: { stdout: 'built', stderr: '' }, text: 'built' } as never))) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    await $.prompt.submit({ text: 'build it' } as never)
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    const pose = /slow build/i
    const thinking = /ponders|wanders, thinking|mutters/

    const call = $.tool.call({ tool: 'Bash', command: 'make', description: 'Run the slow build', tool_use_id: 't1' } as never)
    await clock.advance(30000) // the tool is still running
    expect(await see(pose)).toBeDefined()
    expect(await see(thinking)).toBe(undefined)

    release()
    await call
    await clock.advance(60000) // a long think after the call: the pose stays
    expect(await see(pose)).toBeDefined()
    expect(await see(thinking)).toBe(undefined)
  })

  test(`a permission dialog makes Claude call for you, an auto-settled ask does not (${surface})`, async ($, on) => {
    world(on)
    on('tool.check', () => ({ decision: 'ask' }))
    on('classic.PermissionRequest', () => ({}) as never)
    on('prompt.submit', (_, e) => e as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    await $.prompt.submit({ text: 'clean up' } as never)
    await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf build' } } as never)
    const quiet = await $.ui.mount({ ...BAND, surface })
    expect(await quiet.find({ type: 'Text', text: /Claude needs you/ })).toBe(undefined)
    await quiet.unmount()
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
    const band = await $.ui.mount({ ...BAND, surface })
    expect(await band.find({ type: 'Text', text: /allow Bash\(rm -rf build\)/ })).toBeDefined()
    await band.unmount()
  })

  test(`context and plan limits show as numbers, and calm mode still tells the story (${surface})`, async ($, on) => {
    const clock = world(on)
    on('session.measure', (_, e) => ({ changed: e.changed }))
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const run = (args: string) =>
      $.command.run({ command: 'tales', args, origin: { kind: 'composer' }, presentation: 'command' } as never)
    const calm = (await run('calm')) as { text?: string }
    expect(calm.text).toMatch(/calm/i)
    await $.session.measure({
      context: { window: 200000, percent: 72 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 40 },
        { kind: 'seven_day', percentUsed: 96 },
      ],
      changed: [],
    } as never)
    await run('demo')
    await clock.advance(5000)
    const band = await $.ui.mount({ ...BAND, surface })
    expect(await band.find({ type: 'Text', text: /ctx 74%/ })).toBeDefined() // the demo sets 74 at 3 s
    expect(await band.find({ type: 'Text', text: /5h 40%/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /7d 96%/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /Claude .*register\.tsx/ })).toBeDefined()
    await band.unmount()
    const status = (await run('')) as { text?: string }
    expect(status.text).toMatch(/\(calm\)/)
  })
}
