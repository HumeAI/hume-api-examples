import {AudioQueue} from './AudioQueue'
test('AudioQueue', async () => {
  const log: Array<string> = []
  const aq = new AudioQueue()
  log.push('1') // t=0
  aq.add(async () => {
    // t=0
    log.push('2')
    await new Promise((resolve) => setTimeout(resolve, 25))
    // t=25
    log.push('3')
    await new Promise((resolve) => setTimeout(resolve, 75))
    // t=100
    log.push('5')
  })
  await new Promise((resolve) => setTimeout(resolve, 50))
  // t=50
  log.push('4')
  aq.add(async () => {
    // t=100
    log.push('6')
    await new Promise((resolve) => setTimeout(resolve, 100))
    // t=200
    log.push('7')
  })
  await new Promise((resolve) => setTimeout(resolve, 202))
  expect(log.join(',')).toBe('1,2,3,4,5,6,7')
  // @ts-ignore
  expect(aq.tasks).toEqual([])
  // @ts-ignore
  expect(aq.currentClip).toEqual(null)
})
