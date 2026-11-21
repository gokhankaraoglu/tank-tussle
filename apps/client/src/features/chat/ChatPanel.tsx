import { useChat, visibleMessages, type ChatChannel } from '@tank-tussle/client-core'
import type { PlayerIndex } from '@tank-tussle/game-core'
import { CHAT_LIMITS, type ChatMessage } from '@tank-tussle/protocol'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './chat.module.css'

export interface ChatPlayer {
  readonly name: string
  readonly color: string
}

interface ChatPanelProps {
  readonly chat: ChatChannel
  /** Host and guest, to label messages. */
  readonly players: readonly [ChatPlayer, ChatPlayer | null]
}

/** A chat button with an unread badge that opens a panel to talk to the opponent. */
export const ChatPanel = ({ chat, players }: ChatPanelProps) => {
  const state = useChat(chat)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) chat.markRead()
  }, [open, chat, state.unread])

  return (
    <div className={styles.dock}>
      {open ? (
        <ChatWindow chat={chat} players={players} onClose={() => setOpen(false)} />
      ) : (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setOpen(true)}
          aria-label={state.unread > 0 ? `Open chat, ${state.unread} new` : 'Open chat'}
        >
          💬
          {state.unread > 0 && <span className={styles.badge}>{state.unread}</span>}
        </button>
      )}
    </div>
  )
}

interface ChatWindowProps extends ChatPanelProps {
  readonly onClose: () => void
}

const ChatWindow = ({ chat, players, onClose }: ChatWindowProps) => {
  const state = useChat(chat)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const list = useRef<HTMLOListElement>(null)
  const messages = visibleMessages(state)

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages.length])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim().length === 0 || sending) return
    setSending(true)
    const failure = await chat.send(draft)
    setSending(false)
    setError(failure)
    if (!failure) setDraft('')
  }

  return (
    <section className={styles.window} aria-label="Chat">
      <header className={styles.header}>
        <span className={styles.title}>Chat</span>
        <button
          type="button"
          className={styles.headerButton}
          onClick={() => chat.setMuted(!state.muted)}
          aria-pressed={state.muted}
          title="Hide the opponent's messages"
        >
          {state.muted ? 'Unmute opponent' : 'Mute opponent'}
        </button>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close chat">
          ×
        </button>
      </header>

      <ol className={styles.messages} ref={list} aria-live="polite">
        {messages.length === 0 && (
          <li className={styles.empty}>
            {state.muted ? 'Opponent muted.' : 'Say hello! Keep it friendly.'}
          </li>
        )}
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            author={players[message.player]}
            own={message.player === state.you}
            reported={state.reported.includes(message.id)}
            onReport={() => void chat.report(message.id).then(setError)}
          />
        ))}
      </ol>

      <form className={styles.form} onSubmit={(event) => void send(event)}>
        <input
          className={styles.input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={CHAT_LIMITS.maxLength}
          placeholder="Type a message"
          aria-label="Message"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className={styles.send} disabled={draft.trim().length === 0}>
          Send
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

interface MessageProps {
  readonly message: ChatMessage
  readonly author: ChatPlayer | null
  readonly own: boolean
  readonly reported: boolean
  readonly onReport: () => void
}

const Message = ({ message, author, own, reported, onReport }: MessageProps) => (
  <li className={styles.message} data-own={own}>
    <span className={styles.author} style={{ color: author?.color }}>
      {own ? 'You' : (author?.name ?? playerLabel(message.player))}
    </span>
    <span className={styles.text}>{message.text}</span>
    {!own && (
      <button
        type="button"
        className={styles.report}
        onClick={onReport}
        disabled={reported}
        title="Report this message"
      >
        {reported ? 'Reported' : 'Report'}
      </button>
    )}
  </li>
)

const playerLabel = (player: PlayerIndex): string => (player === 0 ? 'Host' : 'Guest')
