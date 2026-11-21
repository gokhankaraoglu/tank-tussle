import { describe, expect, it } from 'vitest'
import { isProfane, maskProfanity } from './profanity.js'

describe('profanity filter', () => {
  it('masks whole bad words in Turkish and English', () => {
    expect(maskProfanity('siktir git')).toBe('****** git')
    expect(maskProfanity('what the fuck')).toBe('what the ****')
  })

  it('sees through case, Turkish letters, digits and repeated letters', () => {
    expect(isProfane('SİKTİR')).toBe(true)
    expect(isProfane('0r0spu')).toBe(true)
    expect(isProfane('fuuuuck')).toBe(true)
    expect(isProfane('orospucocugu')).toBe(true)
  })

  it('leaves innocent words that merely contain a bad one alone', () => {
    for (const word of [
      'sıkıntı',
      'sikinti',
      'Scunthorpe',
      'dickens',
      'aqua',
      'gotik',
      'piçikato',
    ]) {
      expect(isProfane(word), word).toBe(false)
    }
    expect(maskProfanity('Nice shot, good luck!')).toBe('Nice shot, good luck!')
  })
})
