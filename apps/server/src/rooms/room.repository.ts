import { Injectable } from '@nestjs/common'
import { playerOfSocket, playerOfToken, type Room } from './room.js'

/** Storage port for rooms. Swap the in-memory adapter for Redis to scale horizontally. */
export interface RoomRepository {
  save(room: Room): void
  findById(id: string): Room | undefined
  findBySocket(socketId: string): Room | undefined
  findByToken(token: string): Room | undefined
  delete(id: string): void
  findAll(): Room[]
}

export const ROOM_REPOSITORY = Symbol('ROOM_REPOSITORY')

@Injectable()
export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>()

  save(room: Room): void {
    this.rooms.set(room.id, room)
  }

  findById(id: string): Room | undefined {
    return this.rooms.get(id)
  }

  findBySocket(socketId: string): Room | undefined {
    return this.findAll().find((room) => playerOfSocket(room, socketId) !== null)
  }

  findByToken(token: string): Room | undefined {
    return this.findAll().find((room) => playerOfToken(room, token) !== null)
  }

  delete(id: string): void {
    this.rooms.delete(id)
  }

  findAll(): Room[] {
    return [...this.rooms.values()]
  }
}
