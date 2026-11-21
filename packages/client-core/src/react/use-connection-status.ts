import { useSyncExternalStore } from 'react'
import type { ConnectionStatus, OnlineConnection } from '../network/online-connection.js'

export const useConnectionStatus = (connection: OnlineConnection): ConnectionStatus =>
  useSyncExternalStore(connection.onStatus, connection.getStatus)
