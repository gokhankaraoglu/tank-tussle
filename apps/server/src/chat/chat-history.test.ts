import { describe, expect, it } from 'vitest'
import { ChatHistory } from './chat-history.js'

const message = (id: string) => ({ id, player: 0 as const, text: id, sentAt: 0 })

describe('ChatHistory', () => {
  it('finds a recent message of a room', () => {
    const history = new ChatHistory()
    history.add('room', message('a'))
    expect(history.find('room', 'a')?.text).toBe('a')
    expect(history.find('other', 'a')).toBeUndefined()
  })

  it('keeps only the last messages of a room', () => {
    const history = new ChatHistory(2)
    ;['a', 'b', 'c'].forEach((id) => history.add('room', message(id)))
    expect(history.find('room', 'a')).toBeUndefined()
    expect(history.find('room', 'c')).toBeDefined()
  })

  it('forgets the least recently active room when full', () => {
    const history = new ChatHistory(10, 2)
    history.add('one', message('1'))
    history.add('two', message('2'))
    history.add('one', message('1b'))
    history.add('three', message('3'))
    expect(history.find('two', '2')).toBeUndefined()
    expect(history.find('one', '1')).toBeDefined()
  })
})
