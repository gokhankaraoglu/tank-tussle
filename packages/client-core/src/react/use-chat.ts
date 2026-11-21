import { useSyncExternalStore } from 'react'
import type { ChatChannel, ChatState } from '../network/chat-channel.js'

export const useChat = (chat: ChatChannel): ChatState =>
  useSyncExternalStore(chat.subscribe, chat.getState)
