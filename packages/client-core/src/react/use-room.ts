import type { PlayerIndex } from '@tank-tussle/game-core'
import {
  ROOM_CLOSED_MESSAGES,
  ServerEvent,
  type MatchStartedPayload,
  type RoomView,
} from '@tank-tussle/protocol'
import { useEffect, useState } from 'react'
import type { OnlineConnection } from '../network/online-connection.js'

export interface RoomModel {
  readonly room: RoomView
  readonly you: PlayerIndex
  /** Set when the server closed the room. */
  readonly closedMessage: string | null
}

/** Live view of the waiting room. Calls `onMatchStarted` when the host starts the game. */
export const useRoom = (
  connection: OnlineConnection,
  initial: { room: RoomView; you: PlayerIndex },
  onMatchStarted: (payload: MatchStartedPayload, room: RoomView) => void,
): RoomModel => {
  const [model, setModel] = useState<RoomModel>({ ...initial, closedMessage: null })

  useEffect(() => {
    const { socket } = connection
    let latest = initial.room
    const onUpdated = ({ room }: { room: RoomView }) => {
      latest = room
      setModel((current) => ({ ...current, room }))
    }
    const onClosed = ({ reason }: { reason: keyof typeof ROOM_CLOSED_MESSAGES }) => {
      connection.forgetSeat()
      setModel((current) => ({ ...current, closedMessage: ROOM_CLOSED_MESSAGES[reason] }))
    }
    const onStarted = (payload: MatchStartedPayload) => {
      connection.takeStartedMatch()
      onMatchStarted(payload, latest)
    }
    const stopResume = connection.onResumed((outcome) => {
      if (outcome.ok) onUpdated({ room: outcome.payload.room })
      else setModel((current) => ({ ...current, closedMessage: outcome.error }))
    })

    socket.on(ServerEvent.RoomUpdated, onUpdated)
    socket.on(ServerEvent.RoomClosed, onClosed)
    socket.on(ServerEvent.MatchStarted, onStarted)
    // The match may have started before this screen was listening.
    const missed = connection.takeStartedMatch()
    if (missed) onMatchStarted(missed, latest)
    return () => {
      socket.off(ServerEvent.RoomUpdated, onUpdated)
      socket.off(ServerEvent.RoomClosed, onClosed)
      socket.off(ServerEvent.MatchStarted, onStarted)
      stopResume()
    }
  }, [connection, initial.room, onMatchStarted])

  return model
}
