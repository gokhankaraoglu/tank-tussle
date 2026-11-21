/**
 * A small, deliberately conservative profanity filter for Turkish and English. It masks whole
 * words, so innocent words that merely contain a bad one ("sıkıntı", "Scunthorpe") survive.
 * It will never catch everything; reporting covers the rest.
 */

/** Words masked only when they stand alone. Short ones would hit innocent words otherwise. */
const WORDS = new Set([
  // Turkish
  'amk',
  'aq',
  'amq',
  'mk',
  'oc',
  'oç',
  'sik',
  'siktir',
  'sikik',
  'yarak',
  'yarrak',
  'got',
  'göt',
  'gotveren',
  'ibne',
  'kahpe',
  'pic',
  'piç',
  'pezevenk',
  'orospu',
  'kaltak',
  'yavsak',
  'yavşak',
  'serefsiz',
  'şerefsiz',
  'amcik',
  'amcık',
  'amina',
  'amına',
  'sikerim',
  'sikeyim',
  // English
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bitch',
  'cunt',
  'asshole',
  'bastard',
  'dick',
  'whore',
  'slut',
  'faggot',
  'fag',
  'nigger',
  'nigga',
  'retard',
])

/** Stems masked at the start of any word: long and specific enough not to hit innocent words. */
const STEMS = ['orospu', 'pezevenk', 'siktir', 'sikerim', 'amina', 'yarrak', 'fuck', 'motherf']

/** Undoes the usual disguises: case, Turkish letters, digits for letters, repeated letters. */
const normalise = (word: string): string =>
  word
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/\u0307/g, '')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1')

const NORMALISED_WORDS = new Set([...WORDS].map(normalise))

export const isProfane = (word: string): boolean => {
  const plain = normalise(word)
  if (plain.length === 0) return false
  return NORMALISED_WORDS.has(plain) || STEMS.some((stem) => plain.startsWith(normalise(stem)))
}

/** Replaces each profane word with asterisks of the same length. */
export const maskProfanity = (text: string): string =>
  text.replace(/[\p{L}\p{N}_*.$@!]+/gu, (word) =>
    isProfane(word) ? '*'.repeat([...word].length) : word,
  )
