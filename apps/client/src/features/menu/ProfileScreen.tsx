import type { PlayerProfile } from '@tank-tussle/game-core'
import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button.js'
import { Panel, Screen } from '../../shared/ui/Screen.js'
import { ProfileFields } from '../setup/PlayerSetup.js'
import styles from '../setup/setup.module.css'

interface ProfileScreenProps {
  readonly profile: PlayerProfile
  readonly onSave: (profile: PlayerProfile) => void
  readonly onBack: () => void
}

/** The name and colour used for quick matches, the ladder and online games. */
export const ProfileScreen = ({ profile, onSave, onBack }: ProfileScreenProps) => {
  const [draft, setDraft] = useState(profile)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSave(draft)
  }

  return (
    <Screen title="Your tank">
      <Panel>
        <form className={styles.form} onSubmit={submit}>
          <ProfileFields heading="You" profile={draft} onChange={setDraft} />
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button variant="primary" type="submit" disabled={draft.name.trim().length === 0}>
              Save
            </Button>
          </div>
        </form>
      </Panel>
    </Screen>
  )
}
