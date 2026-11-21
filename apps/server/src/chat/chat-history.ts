import type { ChatMessage } from '@tank-tussle/protocol'

/**
 * The last few messages of each room, kept so a report can quote what was really said instead
 * of trusting the reporter. Memory is bounded: per room and in total.
 */
export class ChatHistory {
  private readonly rooms = new Map<string, ChatMessage[]>()

  constructor(
    private readonly perRoom = 50,
    private readonly maxRooms = 300,
  ) {}

  add(roomId: string, message: ChatMessage): void {
    const messages = this.rooms.get(roomId) ?? []
    // Re-inserting keeps the map in "recently used" order for eviction.
    this.rooms.delete(roomId)
    this.rooms.set(roomId, [...messages, message].slice(-this.perRoom))
    if (this.rooms.size > this.maxRooms) {
      const oldest = this.rooms.keys().next().value
      if (oldest !== undefined) this.rooms.delete(oldest)
    }
  }

  find(roomId: string, messageId: string): ChatMessage | undefined {
    return this.rooms.get(roomId)?.find((message) => message.id === messageId)
  }

  forget(roomId: string): void {
    this.rooms.delete(roomId)
  }
}
