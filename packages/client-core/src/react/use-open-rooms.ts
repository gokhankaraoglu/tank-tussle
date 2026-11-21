import { ServerEvent, type RoomSummary } from '@tank-tussle/protocol'
import { useEffect, useState } from 'react'
import type { OnlineConnection } from '../network/online-connection.js'
import { useConnectionStatus } from './use-connection-status.js'

/** Public rooms, fetched once connected and kept live by server broadcasts. */
export const useOpenRooms = (connection: OnlineConnection): readonly RoomSummary[] => {
  const status = useConnectionStatus(connection)
  const [rooms, setRooms] = useState<readonly RoomSummary[]>([])

  useEffect(() => {
    const { socket } = connection
    socket.on(ServerEvent.Rooms, setRooms)
    return () => {
      socket.off(ServerEvent.Rooms, setRooms)
    }
  }, [connection])

  useEffect(() => {
    if (status !== 'connected') return
    let active = true
    void connection.listRooms().then((list) => active && setRooms(list))
    return () => {
      active = false
    }
  }, [connection, status])

  return rooms
}
