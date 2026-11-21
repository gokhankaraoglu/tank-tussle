import type { PlayerProfile } from '@tank-tussle/game-core'
import type {
  AimPayload,
  CreateRoomPayload,
  FirePayload,
  JoinRoomPayload,
  MovePayload,
  PickWeaponPayload,
  ResumeRequest,
} from './events.js'
import { ROOM_OPTIONS, type RoomSettings, type WeaponsPerPlayer } from './rooms.js'

export const PROFILE_LIMITS = { nameMaxLength: 16 } as const

/** Raised when a payload from the network does not match the contract. */
export class InvalidPayloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPayloadError'
  }
}

type Parser<T> = (input: unknown) => T

const asRecord = (input: unknown): Record<string, unknown> => {
  if (typeof input !== 'object' || input === null)
    throw new InvalidPayloadError('Expected an object')
  return input as Record<string, unknown>
}

const finiteNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidPayloadError(`${field} must be a number`)
  }
  return value
}

const integer = (value: unknown, field: string): number => {
  const number = finiteNumber(value, field)
  if (!Number.isInteger(number) || number < 0) {
    throw new InvalidPayloadError(`${field} must be a non-negative integer`)
  }
  return number
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export const parsePlayerProfile: Parser<PlayerProfile> = (input) => {
  const record = asRecord(input)
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (name.length === 0 || name.length > PROFILE_LIMITS.nameMaxLength) {
    throw new InvalidPayloadError(`name must be 1–${PROFILE_LIMITS.nameMaxLength} characters`)
  }
  if (typeof record.color !== 'string' || !HEX_COLOR.test(record.color)) {
    throw new InvalidPayloadError('color must be a hex colour like #ff8800')
  }
  return { name, color: record.color }
}

export const parseRoomSettings: Parser<RoomSettings> = (input) => {
  const record = asRecord(input)
  const visibility = ROOM_OPTIONS.visibility.find((option) => option === record.visibility)
  if (!visibility) throw new InvalidPayloadError('visibility must be public or private')
  const weaponsPerPlayer = ROOM_OPTIONS.weaponsPerPlayer.find(
    (option) => option === record.weaponsPerPlayer,
  )
  if (!weaponsPerPlayer) {
    throw new InvalidPayloadError(
      `weaponsPerPlayer must be one of ${ROOM_OPTIONS.weaponsPerPlayer.join(', ')}`,
    )
  }
  return { visibility, weaponsPerPlayer: weaponsPerPlayer as WeaponsPerPlayer }
}

export const parseCreateRoom: Parser<CreateRoomPayload> = (input) => {
  const record = asRecord(input)
  return {
    profile: parsePlayerProfile(record.profile),
    settings: parseRoomSettings(record.settings),
  }
}

/** Room codes are case-insensitive; people type them by hand. */
export const normalizeRoomCode = (code: string): string => code.trim().toLowerCase()

export const parseJoinRoom: Parser<JoinRoomPayload> = (input) => {
  const record = asRecord(input)
  const roomId = typeof record.roomId === 'string' ? normalizeRoomCode(record.roomId) : ''
  if (roomId.length !== ROOM_OPTIONS.codeLength) {
    throw new InvalidPayloadError(`Room codes have ${ROOM_OPTIONS.codeLength} characters`)
  }
  return { roomId, profile: parsePlayerProfile(record.profile) }
}

export const parseResume: Parser<ResumeRequest> = (input) => {
  const token = asRecord(input).token
  if (typeof token !== 'string' || token.length === 0 || token.length > 64) {
    throw new InvalidPayloadError('token is required')
  }
  return { token }
}

export const parsePickWeapon: Parser<PickWeaponPayload> = (input) => ({
  poolIndex: integer(asRecord(input).poolIndex, 'poolIndex'),
})

export const parseAim: Parser<AimPayload> = (input) => {
  const record = asRecord(input)
  return { angle: finiteNumber(record.angle, 'angle'), power: finiteNumber(record.power, 'power') }
}

export const parseMove: Parser<MovePayload> = (input) => {
  const direction = asRecord(input).direction
  if (direction !== -1 && direction !== 1)
    throw new InvalidPayloadError('direction must be -1 or 1')
  return { direction }
}

export const parseFire: Parser<FirePayload> = (input) => {
  const record = asRecord(input)
  return {
    angle: finiteNumber(record.angle, 'angle'),
    power: finiteNumber(record.power, 'power'),
    slot: integer(record.slot, 'slot'),
  }
}
