import { useChat, visibleMessages, type ChatChannel } from '@tank-tussle/client-core'
import { CHAT_LIMITS, type ChatMessage } from '@tank-tussle/protocol'
import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, radius, space } from '../theme'

export interface ChatPlayer {
  readonly name: string
  readonly color: string
}

interface ChatPanelProps {
  readonly chat: ChatChannel
  /** Host and guest, to label messages. */
  readonly players: readonly [ChatPlayer, ChatPlayer | null]
}

/** A chat button with an unread badge that opens a sheet to talk to the opponent. */
export const ChatPanel = ({ chat, players }: ChatPanelProps) => {
  const state = useChat(chat)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) chat.markRead()
  }, [open, chat, state.unread])

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.unread > 0 ? `Open chat, ${state.unread} new` : 'Open chat'}
        onPress={() => setOpen(true)}
        style={styles.toggle}
        hitSlop={6}
      >
        <Text style={styles.toggleIcon}>💬</Text>
        {state.unread > 0 && <Text style={styles.badge}>{state.unread}</Text>}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        supportedOrientations={['landscape', 'portrait']}
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <ChatWindow chat={chat} players={players} onClose={() => setOpen(false)} />
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

interface ChatWindowProps extends ChatPanelProps {
  readonly onClose: () => void
}

const ChatWindow = ({ chat, players, onClose }: ChatWindowProps) => {
  const state = useChat(chat)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const list = useRef<ScrollView>(null)
  const messages = visibleMessages(state)

  const send = async () => {
    if (draft.trim().length === 0) return
    const failure = await chat.send(draft)
    setError(failure)
    if (!failure) setDraft('')
  }

  return (
    <View style={styles.window} accessibilityLabel="Chat">
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: state.muted }}
          onPress={() => chat.setMuted(!state.muted)}
          style={[styles.pill, state.muted && styles.pillOn]}
        >
          <Text style={[styles.pillText, state.muted && styles.pillTextOn]}>
            {state.muted ? 'Unmute opponent' : 'Mute opponent'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={list}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <Text style={styles.empty}>
            {state.muted ? 'Opponent muted.' : 'Say hello! Keep it friendly.'}
          </Text>
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
      </ScrollView>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          maxLength={CHAT_LIMITS.maxLength}
          placeholder="Type a message"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Message"
          returnKeyType="send"
          onSubmitEditing={() => void send()}
          blurOnSubmit={false}
        />
        <Pressable
          accessibilityRole="button"
          disabled={draft.trim().length === 0}
          onPress={() => void send()}
          style={[styles.send, draft.trim().length === 0 && styles.disabled]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
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
  <View style={[styles.message, own && styles.own]}>
    <Text style={[styles.author, { color: author?.color ?? colors.muted }]}>
      {own ? 'You' : (author?.name ?? (message.player === 0 ? 'Host' : 'Guest'))}
    </Text>
    <Text style={styles.text}>{message.text}</Text>
    {!own && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report this message"
        disabled={reported}
        onPress={onReport}
        style={[styles.pill, reported && styles.disabled]}
      >
        <Text style={styles.pillText}>{reported ? 'Reported' : 'Report'}</Text>
      </Pressable>
    )}
  </View>
)

const styles = StyleSheet.create({
  toggle: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  toggleIcon: { fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.accent,
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  window: {
    width: '92%',
    maxWidth: 420,
    height: '86%',
    maxHeight: 460,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  close: { color: colors.text, fontSize: 24, paddingHorizontal: space.xs },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.accent },
  pillText: { color: colors.muted, fontSize: 11 },
  pillTextOn: { color: colors.accent },
  messages: { flex: 1 },
  messagesContent: { gap: space.sm, padding: space.md },
  empty: { color: colors.muted, textAlign: 'center' },
  message: {
    maxWidth: '85%',
    alignSelf: 'flex-start',
    gap: 2,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  own: { alignSelf: 'flex-end', alignItems: 'flex-end', backgroundColor: '#1e3557' },
  author: { fontSize: 11, fontWeight: '700' },
  text: { color: colors.text },
  form: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
  },
  send: {
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.small,
    backgroundColor: colors.accent,
  },
  sendText: { color: colors.accentText, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
})
