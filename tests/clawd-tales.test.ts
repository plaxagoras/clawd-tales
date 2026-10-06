import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { HERO_W, STAGE_ROWS, glyph, lines, mirror, sprite, stage, tierOf, weatherOf } from '../hooks/art'
import {
  bashEggs,
  beat,
  commitMessage,
  ending,
  endingAction,
  fidgetAt,
  fishing,
  holidayOf,
  moodOf,
  notFound,
  restCaption,
  skyOf,
  testCounts,
  tokenMilestone,
  waitBeat,
  warpColor,
  scarfColor,
  countCall,
  formOf,
  growCaption,
  readStats,
  GROW_AT,
  NEW_STATS,
} from '../hooks/story'

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
const ACTIONS = ['walk', 'run', 'sneak', 'read', 'dig', 'fly', 'carry', 'trip', 'cheer', 'alert', 'sit', 'yawn', 'sleep', 'wave', 'scratch', 'look', 'cover', 'wink', 'fish', 'reel', 'dizzy', 'flip', 'sweep', 'drop', 'nod', 'dance', 'flag', 'listen', 'juggle', 'stretch', 'hatch'] as const

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

test('prompts have moods, and fun Bash commands are eggs', () => {
  expect(moodOf('thanks, that works')).toBe('thanks')
  expect(moodOf('Good job on the parser')).toBe('thanks')
  expect(moodOf('no, not like that')).toBe('scold')
  expect(moodOf("that's not what I asked for")).toBe('scold')
  expect(moodOf('add a note on node versions')).toBe(null)
  expect(bashEggs('git add -A && git commit -m "x" && git push')).toEqual(['commit', 'push'])
  expect(bashEggs('rm -rf build')).toEqual(['nuke'])
  expect(bashEggs('rm -r build')).toEqual([])
  expect(bashEggs('npm install left-pad')).toEqual(['install'])
  expect(bashEggs('sl')).toEqual(['sl'])
  expect(bashEggs('slack-cli send')).toEqual([])
  expect(commitMessage('git commit -m "Fix the band\n\nmore"')).toBe('Fix the band')
  expect(commitMessage("git commit -m \"$(cat <<'EOF'\nTeach Clawd tricks\n\nbody\nEOF\n)\"")).toBe('Teach Clawd tricks')
  expect(notFound('bash: line 1: sl: command not found')).toBe('sl')
  expect(notFound('all good')).toBe(null)
})

test('the calendar and the clock dress the stage', () => {
  expect(holidayOf(new Date(2026, 9, 31))).toBe('halloween')
  expect(holidayOf(new Date(2026, 11, 25))).toBe('christmas')
  expect(holidayOf(new Date(2027, 0, 1))).toBe('newyear')
  expect(holidayOf(new Date(2027, 3, 1))).toBe('aprilfools')
  expect(holidayOf(new Date(2026, 9, 5))).toBe(null)
  expect(skyOf(13)).toBe('day')
  expect(skyOf(19)).toBe('dusk')
  expect(skyOf(2)).toBe('night')
  const rows = stage({ ...HERO, action: 'walk' }, [], 0, 80, {
    weather: 'clear', bugs: 0, todos: null, holiday: 'halloween', hat: 'witch', sky: 'night',
  })
  const all = rows.join('')
  for (const key of ['A', 'O', 'W']) expect(all.includes(key)).toBe(true) // hat and bats, pumpkin, stars
})

test('rest time fidgets, then dreams of the last pose', () => {
  expect(fidgetAt(3000, 0)).toBe(null) // the first slot is a plain sit
  expect(fidgetAt(8000, 0)).not.toBe(null)
  expect(fidgetAt(12000, 0)).toBe(null) // between fidgets
  expect(restCaption('sleep', 'read')).toMatch(/dreaming of books/)
  const asleep = stage({ ...HERO, action: 'sleep', last: 'read' }, [], 15, 60)
  expect(asleep.join('').includes('B')).toBe(true) // the book in the dream bubble
})

test('a long wait goes fishing, with a bite now and then', () => {
  expect(fishing(5000)).toBe(null)
  expect(fishing(16000)?.action).toBe('fish')
  expect(fishing(28000)?.action).toBe('reel')
  expect(fishing(50000)).toBe(null)
  const rows = stage({ ...HERO, action: 'fish' }, [], 0, 60)
  expect(rows.join('').includes('r')).toBe(true) // bobber
  expect((rows[STAGE_ROWS - 1] ?? '').includes('j')).toBe(true) // the puddle
  const bite = stage({ ...HERO, action: 'reel' }, [], 0, 60)
  expect(bite.join('').includes('c')).toBe(true) // the fish
})

test('eyes glance, and dizzy, flip, sweep and drop draw their extras', () => {
  const ahead = stage({ ...HERO }, [], 0, 40).join('\n')
  const left = stage({ ...HERO, glance: -1, glanceUntil: 10 }, [], 0, 40, { weather: 'clear', bugs: 0, todos: null, now: 5 }).join('\n')
  expect(left).not.toBe(ahead)
  expect(left.includes('.koookoo.')).toBe(true)
  const dizzy = stage({ ...HERO, action: 'dizzy' }, [], 0, 40).join('')
  expect(dizzy.includes('z')).toBe(true) // circling stars
  const flip = stage({ ...HERO, action: 'flip' }, [], 0, 40).join('')
  expect(flip.includes('s')).toBe(true) // the table
  const falling = stage({ ...HERO, action: 'drop', since: 0 }, [], 0, 40, { weather: 'clear', bugs: 0, todos: null, now: 100 })
  const landed = stage({ ...HERO, action: 'drop', since: 0 }, [], 0, 40, { weather: 'clear', bugs: 0, todos: null, now: 900 })
  expect(falling.findIndex(r => r.includes('o'))).toBeLessThan(landed.findIndex(r => r.includes('o')))
})

test('the project scarf draws under the eyes, and every project gets a steady color', () => {
  const extras = { weather: 'clear', bugs: 0, todos: null } as const
  expect(scarfColor('/home/a/repo')).toBe(scarfColor('/home/a/repo'))
  const colors = new Set(['/a', '/b', '/c', '/d', '/e', '/f', '/g', '/h'].map(scarfColor))
  expect(colors.size).toBeGreaterThan(2)
  for (const c of colors) expect(['t', 'p', 'h', 'f', 'o'].includes(c)).toBe(false) // never a helper's tint or the body
  const bare = stage({ ...HERO }, [], 0, 60, extras)
  const wrapped = stage({ ...HERO }, [], 0, 60, { ...extras, scarf: 'c' })
  expect(bare.join('').includes('c')).toBe(false)
  const row = wrapped.findIndex(r => r.includes('ccccccc'))
  expect(row).toBeGreaterThan(wrapped.findIndex(r => r.includes('k'))) // below the eyes
  const left = stage({ ...HERO, dir: -1 }, [], 0, 60, { ...extras, scarf: 'c' })
  expect(left.some(r => r.includes('ccccccc'))).toBe(true)
  expect(stage({ ...HERO, action: 'hatch' }, [], 0, 60, { ...extras, scarf: 'c' }).join('').includes('c')).toBe(false) // no scarf on an egg
})

test('Clawd grows into the work it does most, and holds its form against a near tie', () => {
  let s = { ...NEW_STATS }
  for (let n = 0; n < GROW_AT - 1; n++) s = countCall(s, 'read')
  expect(formOf(s)).toBe(null)
  s = countCall(s, 'run')
  expect(s.xp).toBe(GROW_AT)
  expect(formOf(s)).toBe('scholar')
  s = { ...s, form: 'scholar' }
  for (let n = 0; n < GROW_AT; n++) s = countCall(s, 'run') // 201 runs to 199 reads: not 10% ahead
  expect(formOf(s)).toBe('scholar')
  for (let n = 0; n < 30; n++) s = countCall(s, 'run')
  expect(formOf(s)).toBe('hacker')
  expect(countCall(s, 'cheer').by).toEqual(s.by) // poses with no work type count toward xp only
  expect(growCaption('explorer', null)).toMatch(/grows up into an explorer/)
  expect(growCaption('hacker', 'scholar')).toMatch(/a hacker now/)
  expect(readStats(undefined)).toBe(null)
  expect(readStats({ xp: 'x' })).toBe(null)
  expect(readStats({ xp: 3, by: { read: 1 }, form: 'wizard' })?.form).toBe(null)
  expect(sprite('hatch', 0).length).toBe(5)
})

test('hats and face gear draw', () => {
  const rows = stage({ ...HERO }, [], 0, 60, { weather: 'clear', bugs: 0, todos: null, hat: 'tophat', face: 'shades' })
  const top = rows.join('')
  expect(top.includes('e')).toBe(true)
  expect(top.includes('W')).toBe(true)
})

test('effects, emotes and a patted helper draw', () => {
  const fx = [
    { id: 1, kind: 'confetti', start: 0, dur: 2200, x: 10 },
    { id: 2, kind: 'train', start: 0, dur: 8000, x: 0 },
    { id: 3, kind: 'whale', start: 0, dur: 16000, x: 0 },
  ] as const
  const rows = stage({ ...HERO, emote: 'think' }, [], 0, 80, { weather: 'clear', bugs: 0, todos: null, fx, now: 4000, shiny: true })
  const all = rows.join('')
  for (const key of ['U', 'c', 'n', 'w']) expect(all.includes(key)).toBe(true) // train, whale, shiny body, bubble
  const sad = { id: 'w', label: 'x', tier: 'haiku', state: 'done', action: 'sit', x: 40, dir: 1, steps: 0, sad: true } as const
  const patted = stage({ ...HERO, x: 20 }, [sad], 0, 80)
  expect(patted.some(r => r.includes('e'))).toBe(true) // grey helper
  expect(patted.some(r => r.includes('q'))).toBe(true) // with a heart
})

test('endings match the turn, and tokens have milestones', () => {
  expect(endingAction(2, false)).toBe('nod')
  expect(endingAction(20, false)).toBe('cheer')
  expect(endingAction(90, false)).toBe('dance')
  expect(endingAction(600, false)).toBe('flag')
  expect(endingAction(600, true)).toBe('nod')
  expect(tokenMilestone(40_000, 60_000)).toBe(50_000)
  expect(tokenMilestone(60_000, 90_000)).toBe(null)
  expect(tokenMilestone(90_000, 210_000)).toBe(200_000)
  expect(ending(3, 12, false, 0, 100_000)).toBe('The end · 3 steps · 12s · 100K tokens!')
  expect(waitBeat(1, 'Review the diff').action).toBe('listen')
  expect(waitBeat(3).caption).toMatch(/juggles while 3 helpers/)
  expect(warpColor('Gmail')).toBe(warpColor('Gmail'))
  expect(new Set(['Gmail', 'n8n-mcp', 'blender', 'pubmed', 'deepl'].map(warpColor)).size).toBeGreaterThan(1)
})

test('outfits, heart eyes, brows, the boss tie, headphones, juggling and the warp draw', () => {
  const plain = stage({ ...HERO }, [], 0, 60).join('\n')
  const wizard = stage({ ...HERO }, [], 0, 60, { weather: 'clear', bugs: 0, todos: null, hat: 'wizard' }).join('')
  expect(wizard.includes('b')).toBe(true)
  const hard = stage({ ...HERO }, [], 0, 60, { weather: 'clear', bugs: 0, todos: null, hat: 'hardhat' }).join('')
  expect(hard.includes('y')).toBe(true)
  const smitten = stage({ ...HERO, emote: 'smitten' }, [], 0, 60).join('\n')
  expect(smitten.includes('.qoqoqoq')).toBe(true) // heart eyes
  const eyeRows = (rows: string[]) => rows.filter(r => r.includes('okoooko')).length
  expect(eyeRows(stage({ ...HERO, emote: 'sheepish' }, [], 0, 60))).toBe(eyeRows(stage({ ...HERO }, [], 0, 60)) + 1) // brows
  const tie = stage({ ...HERO }, [], 0, 60, { weather: 'clear', bugs: 0, todos: null, tie: true }).join('\n')
  expect(tie.includes('Wr')).toBe(true)
  expect(plain.includes('Wr')).toBe(false)
  const music = stage({ ...HERO, action: 'listen' }, [], 0, 60).join('')
  expect(music.includes('r') && music.includes('e')).toBe(true) // ear cups and band
  const helpers = (['opus', 'haiku'] as const).map((tier, n) => ({ id: `w${n}`, label: 'x', tier, state: 'running', action: 'walk', x: 50, dir: 1, steps: 0 }) as const)
  const juggling = stage({ ...HERO, action: 'juggle' }, [], 0, 40, { weather: 'clear', bugs: 0, todos: null })
  const tinted = stage({ ...HERO, action: 'juggle' }, helpers, 0, 40).map(r => r.slice(0, 20)).join('')
  expect(juggling.join('').includes('z')).toBe(true) // two plain balls with nobody out
  expect(tinted.includes('p') && tinted.includes('h')).toBe(true) // the helpers' tints
  const warp = [{ id: 1, kind: 'warp', start: 0, dur: 1200, x: 10, color: 'c' }] as const
  expect(stage({ ...HERO }, [], 0, 60, { weather: 'clear', bugs: 0, todos: null, fx: warp, now: 300 }).join('').includes('c')).toBe(true)
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
    // A fullscreen split pane leaves ~5 rows: the stage stays, the caption goes.
    const short = { ...PROPS, maxRows: 5 }
    expect(await see(/[▀▄]/, short)).toBeDefined()
    expect(await see(/Claude .*register\.tsx/, short)).toBe(undefined)

    await clock.advance(5000) // 10 s
    expect(await see(/Review the diff/)).toBeDefined()

    await clock.advance(2500) // 12.5 s
    expect(await see(/3 bugs crawl/)).toBeDefined()

    await clock.advance(6000) // 18.5 s
    expect(await see(/Claude needs you/)).toBeDefined()
    // Short band: one line, still says what it needs.
    expect(await see(/Claude needs you/, { ...PROPS, maxRows: 3 })).toBeDefined()
    // Split pane: a call for you keeps its caption over a cropped stage.
    expect(await see(/Claude needs you/, { ...PROPS, maxRows: 5 })).toBeDefined()
    expect(await see(/[▀▄]/, { ...PROPS, maxRows: 5 })).toBeDefined()

    await clock.advance(5000) // 23.5 s
    expect(await see(/3\/5 tasks/)).toBeDefined()

    await clock.advance(2500) // 26 s: the commit egg
    expect(await see(/seals the parcel/)).toBeDefined()

    await clock.advance(3500) // 29.5 s
    expect(await see(/The end.*crown ×12/)).toBeDefined()

    await clock.advance(10000) // 39.5 s: resting
    expect(await see(/sits by the path/)).toBeDefined()

    await clock.advance(15500) // 55 s: a long wait, so Claude fishes
    expect(await see(/casts a line/)).toBeDefined()

    await clock.advance(39500) // 94.5 s
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

  test(`thanks, a clean streak and a commit all show (${surface})`, async ($, on) => {
    const clock = world(on)
    on('prompt.submit', (_, e) => e as never)
    on('tool.call', () => ({ result: { stdout: 'ok', stderr: '' }, text: 'ok' }) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    await $.prompt.submit({ text: 'thanks! now commit it' } as never)
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    expect(await see(/blushes/)).toBeDefined()
    for (let n = 0; n < 5; n++) await $.tool.call({ tool: 'Read', file_path: `/a/f${n}.ts`, tool_use_id: `r${n}` } as never)
    expect(await see(/×5 combo/)).toBeDefined()
    await $.tool.call({ tool: 'Bash', command: 'git commit -m "Add hats"', tool_use_id: 'c1' } as never)
    expect(await see(/seals the parcel and stamps it: “Add hats”/)).toBeDefined()
    await clock.advance(10000) // a long think keeps the caption
    expect(await see(/seals the parcel/)).toBeDefined()
  })

  test(`stumbles escalate, a quick yes earns hearts, a long wait gets nervous (${surface})`, async ($, on) => {
    const clock = world(on)
    let fail = true
    on('prompt.submit', (_, e) => e as never)
    on('classic.PermissionRequest', () => ({}) as never)
    on('tool.call', () => (fail ? { result: { stdout: '', stderr: 'boom' }, text: 'boom', isError: true } : { result: { stdout: 'ok', stderr: '' }, text: 'ok' }) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    await $.prompt.submit({ text: 'go' } as never)
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    const call = (n: number) => $.tool.call({ tool: 'Read', file_path: `/f${n}`, tool_use_id: `e${n}` } as never)
    await call(1)
    await call(2)
    expect(await see(/sees stars/)).toBeDefined()
    await call(3)
    expect(await see(/flips the table/)).toBeDefined()
    fail = false
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'make' } } as never)
    await clock.advance(31000)
    expect(await see(/waiting 3\ds/)).toBeDefined()
    await call(4)
    expect(await see(/quick yes/)).toBe(undefined) // too slow for hearts
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'make' } } as never)
    await clock.advance(1000)
    await call(5)
    expect(await see(/quick yes/)).toBeDefined()
  })

  test(`the first session hatches an egg, later ones drop Clawd in, and compaction sweeps (${surface})`, async ($, on) => {
    const clock = world(on)
    on('classic.SessionStart', () => ({}) as never)
    on('session.compact', (_, e) => ({ messages: e.messages }) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    await $.classic.SessionStart({ source: 'startup', hook_event_name: 'SessionStart' } as never)
    expect(await see(/egg wobbles/)).toBeDefined()
    await clock.advance(2600)
    expect(await see(/hatches/)).toBeDefined()
    await clock.advance(200000) // rests, then hides
    await $.classic.SessionStart({ source: 'startup', hook_event_name: 'SessionStart' } as never)
    expect(await see(/drops in/)).toBeDefined()
    await clock.advance(200000)
    expect(await see(/drops in|sits/)).toBe(undefined)
    await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [] }] } as never)
    expect(await see(/Squeaky clean/)).toBeDefined()
    await $.session.compact({ trigger: 'precompute', messages: [{ role: 'user', text: 'hi', toolUses: [] }] } as never)
    expect(await see(/Squeaky clean/)).toBeDefined() // a precompute changes nothing
  })

  test(`turn length picks the ending, a helper's turn doesn't end Claude's, and tokens celebrate (${surface})`, async ($, on) => {
    world(on)
    on('prompt.submit', (_, e) => e as never)
    on('turn.complete', () => ({ text: '' }) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const see = async (text: RegExp, props = PROPS) => {
      const band = await $.ui.mount({ ...BAND, props, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    const usage = (n: number) => ({ input_tokens: n, output_tokens: 0, cache_read_input_tokens: 9e6, cache_creation_input_tokens: 0, model: 'm' })
    await $.prompt.submit({ text: 'go' } as never)
    await $.turn.complete({ answer: '', durationMs: 5000, isAborted: false, turnId: 'h', agentId: 'helper-1', reason: 'answer', usage: usage(30_000) } as never)
    expect(await see(/The end/)).toBe(undefined)
    await $.turn.complete({ answer: '', durationMs: 400_000, isAborted: false, turnId: 't', reason: 'answer', usage: usage(25_000) } as never)
    expect(await see(/The end · 0 steps · 400s · 50K tokens!/)).toBeDefined()
    expect(await see(/⚑/, { ...PROPS, maxRows: 3 })).toBeDefined() // the summit flag, as its one-line glyph
    await $.prompt.submit({ text: 'again' } as never)
    await $.turn.complete({ answer: '', durationMs: 2000, isAborted: false, turnId: 't2', reason: 'answer', usage: usage(1000) } as never)
    expect(await see(/tokens!/)).toBe(undefined)
    expect(await see(/^[·˙] $/, { ...PROPS, maxRows: 3 })).toBeDefined() // a quick nod, as its one-line glyph
  })

  test(`waiting on helpers: headphones, then juggling; a long sleep wakes at the reset (${surface})`, async ($, on) => {
    const clock = world(on)
    let release = () => {}
    let spawned = 0
    on('prompt.submit', (_, e) => e as never)
    on('session.measure', (_, e) => ({ changed: e.changed }))
    on('turn.complete', () => ({ text: '' }) as never)
    on('agent.spawn', () => ({ agentId: `demo-a${++spawned}`, model: 'claude-haiku-4-5' }) as never)
    on('tool.call', () => new Promise(r => (release = () => r({ result: {}, text: 'done' } as never))) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    await $.prompt.submit({ text: 'fan out' } as never)
    const call = $.tool.call({ tool: 'Agent', description: 'Scout the docs', prompt: 'x', tool_use_id: 'a1' } as never)
    await $.agent.spawn({ description: 'Scout the docs', subagentType: 'general-purpose', prompt: 'x' } as never)
    expect(await see(/headphones while “Scout the docs”/)).toBeDefined()
    await $.agent.spawn({ description: 'Read the tests', subagentType: 'general-purpose', prompt: 'x' } as never)
    expect(await see(/juggles while 2 helpers/)).toBeDefined()
    release()
    await call

    await $.session.measure({
      context: { window: 200000, percent: 10 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: new Date(80_000).toISOString() }],
      changed: [],
    } as never)
    await $.turn.complete({ answer: '', durationMs: 1000, isAborted: false, turnId: 't', reason: 'answer' } as never)
    await clock.advance(10_000)
    expect(await see(/sleeps until the 5h limit/)).toBeDefined()
    await clock.advance(15_000) // 25 s: within a minute of the reset at 80 s
    expect(await see(/stretches/)).toBeDefined()
    await clock.advance(60_000) // 85 s
    expect(await see(/has reset/)).toBeDefined()
  })

  test(`a turn with no typed prompt still wakes Claude, and so does a stray tool call (${surface})`, async ($, on) => {
    const clock = world(on)
    on('turn.start', (_, e) => ({ turnId: e.turnId }) as never)
    on('turn.complete', () => ({ text: '' }) as never)
    on('tool.call', () => ({ result: { stdout: 'ok', stderr: '' }, text: 'ok' }) as never)
    await $.session.start({ cwd: '/work', surface, isInteractive: true })
    const see = async (text: RegExp) => {
      const band = await $.ui.mount({ ...BAND, surface })
      const found = await band.find({ type: 'Text', text })
      await band.unmount()
      return found
    }
    await $.turn.start({ text: '', turnId: 't1' } as never)
    expect(await see(/set out/)).toBeDefined() // the mock clock's day may be a holiday
    await $.turn.complete({ answer: '', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
    await clock.advance(30_000) // resting, fishing by now
    expect(await see(/casts a line/)).toBeDefined()
    await $.tool.call({ tool: 'Read', file_path: '/a/notes.md', tool_use_id: 'r1' } as never)
    expect(await see(/notes\.md/)).toBeDefined()
    expect(await see(/casts a line/)).toBe(undefined)
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
    expect(((await run('hat tophat')) as { text?: string }).text).toMatch(/puts on the tophat/)
    expect(((await run('face monocle')) as { text?: string }).text).toMatch(/glasses, shades, mustache/)
    expect(((await run('hat none')) as { text?: string }).text).toMatch(/takes off/)
  })
}
