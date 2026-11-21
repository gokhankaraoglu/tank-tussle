import type { GameMode, MatchSetup } from '@tank-tussle/client-core'
import type { PlayerProfile } from '@tank-tussle/game-core'
import { DEFAULT_COLORS, distinctColor, PROFILE_LIMITS } from '@tank-tussle/protocol'
import { useState, type FormEvent } from 'react'
import { useDependencies } from '../../app/dependencies.js'
import { Button } from '../../shared/ui/Button.js'
import { ColorPicker } from '../../shared/ui/ColorPicker.js'
import { Panel, Screen } from '../../shared/ui/Screen.js'
import { TextField } from '../../shared/ui/TextField.js'
import styles from './setup.module.css'

interface PlayerSetupProps {
  readonly mode: GameMode
  readonly onSubmit: (setup: MatchSetup) => void
  readonly onBack: () => void
}

const TITLES: Partial<Record<GameMode, string>> = {
  'hot-seat': 'Two Players',
  online: 'Join a game',
}

/** Names and colours before a two-player match, or before joining an online game by invite. */
export const PlayerSetup = ({ mode, onSubmit, onBack }: PlayerSetupProps) => {
  const { profile } = useDependencies()
  const [first, setFirst] = useState<PlayerProfile>(profile.get)
  const [second, setSecond] = useState<PlayerProfile>(() => ({
    name: 'Player 2',
    color: distinctColor(DEFAULT_COLORS[1], profile.get().color),
  }))
  const twoPlayers = mode === 'hot-seat'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    profile.save(first)
    onSubmit({ mode, players: [trimName(first), trimName(second)], cpuLevel: 1 })
  }

  return (
    <Screen title={TITLES[mode] ?? 'Setup'}>
      <Panel>
        <form className={styles.form} onSubmit={handleSubmit}>
          <ProfileFields
            heading={twoPlayers ? 'Player 1' : 'You'}
            profile={first}
            onChange={setFirst}
          />
          {twoPlayers && <ProfileFields heading="Player 2" profile={second} onChange={setSecond} />}
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!isValid(first) || (twoPlayers && !isValid(second))}
            >
              {twoPlayers ? 'Continue' : 'Find a game'}
            </Button>
          </div>
        </form>
      </Panel>
    </Screen>
  )
}

interface ProfileFieldsProps {
  readonly heading: string
  readonly profile: PlayerProfile
  readonly onChange: (profile: PlayerProfile) => void
}

export const ProfileFields = ({ heading, profile, onChange }: ProfileFieldsProps) => (
  <fieldset className={styles.player} style={{ border: 0, margin: 0, padding: '0 0 24px' }}>
    <legend className={styles.playerTitle} style={{ color: profile.color }}>
      {heading}
    </legend>
    <TextField
      label="Name"
      value={profile.name}
      maxLength={PROFILE_LIMITS.nameMaxLength}
      onChange={(event) => onChange({ ...profile, name: event.target.value })}
      autoComplete="nickname"
    />
    <ColorPicker
      label={`${heading} colour`}
      value={profile.color}
      onChange={(color) => onChange({ ...profile, color })}
    />
  </fieldset>
)

const trimName = (profile: PlayerProfile): PlayerProfile => ({
  ...profile,
  name: profile.name.trim(),
})
const isValid = (profile: PlayerProfile): boolean => profile.name.trim().length > 0
