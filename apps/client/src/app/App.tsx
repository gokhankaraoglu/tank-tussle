import {
  screenMusic,
  useGameFlow,
  useLadderProgress,
  useProfile,
  type Screen,
} from '@tank-tussle/client-core'
import { SoundControls } from '../audio/SoundControls.js'
import { useButtonClickSounds, useMusic } from '../audio/use-audio.js'
import { MatchScreen } from '../features/match/MatchScreen.js'
import { FriendScreen } from '../features/menu/FriendScreen.js'
import { LadderScreen } from '../features/menu/LadderScreen.js'
import { MainMenu } from '../features/menu/MainMenu.js'
import { ProfileScreen } from '../features/menu/ProfileScreen.js'
import { QuickMatchScreen } from '../features/menu/QuickMatchScreen.js'
import { CreateRoom } from '../features/online/CreateRoom.js'
import { OnlineHub } from '../features/online/OnlineHub.js'
import { ResumeScreen } from '../features/online/ResumeScreen.js'
import { WaitingRoom } from '../features/online/WaitingRoom.js'
import { PlayerSetup } from '../features/setup/PlayerSetup.js'
import { useDependencies } from './dependencies.js'

export const App = ({ firstScreen }: { readonly firstScreen: Screen }) => {
  const dependencies = useDependencies()
  const flow = useGameFlow(dependencies, firstScreen)
  const profile = useProfile(dependencies.profile)
  const ladderBeaten = useLadderProgress(dependencies.ladder)
  const { screen } = flow

  useMusic(screenMusic(screen))
  useButtonClickSounds()

  return (
    <>
      {renderScreen()}
      {screen.name !== 'match' && <SoundControls floating />}
    </>
  )

  function renderScreen() {
    switch (screen.name) {
      case 'menu':
        return (
          <MainMenu
            profile={profile}
            ladderBeaten={ladderBeaten}
            onPlay={flow.play}
            onLadder={() => flow.open('ladder')}
            onFriend={() => flow.open('friend')}
            onPractice={flow.practice}
            onProfile={() => flow.open('profile')}
          />
        )
      case 'ladder':
        return (
          <LadderScreen
            beaten={ladderBeaten}
            onChallenge={flow.challenge}
            onBack={flow.backToMenu}
          />
        )
      case 'friend':
        return (
          <FriendScreen
            onSameDevice={() => flow.chooseMode('hot-seat')}
            onOnline={() => flow.playOnline()}
            onBack={flow.backToMenu}
          />
        )
      case 'profile':
        return (
          <ProfileScreen profile={profile} onSave={flow.saveProfile} onBack={flow.backToMenu} />
        )
      case 'quick-match':
        return (
          <QuickMatchScreen
            connection={screen.connection}
            profile={profile}
            onRoom={flow.enterQuickRoom}
            onUnavailable={flow.playComputer}
            onCancel={flow.backToMenu}
          />
        )
      case 'setup':
        return (
          <PlayerSetup mode={screen.mode} onSubmit={flow.submitSetup} onBack={flow.backToMenu} />
        )
      case 'online':
        return (
          <OnlineHub
            connection={screen.connection}
            profile={screen.profile}
            initialCode={screen.joinCode}
            onJoined={flow.enterRoom}
            onCreate={flow.openCreateRoom}
            onBack={flow.backToMenu}
          />
        )
      case 'create-room':
        return (
          <CreateRoom
            connection={screen.connection}
            profile={screen.profile}
            onCreated={flow.enterRoom}
            onBack={flow.backToOnline}
          />
        )
      case 'room':
        return (
          <WaitingRoom
            connection={screen.connection}
            room={screen.room}
            you={screen.you}
            quick={screen.quick}
            onMatchStarted={flow.startMatch}
            onLeave={flow.leaveRoom}
            onNobodyCame={flow.playComputer}
          />
        )
      case 'resuming':
        return (
          <ResumeScreen
            connection={screen.connection}
            onRoom={flow.enterRoom}
            onMatch={flow.startMatch}
            onGiveUp={flow.backToMenu}
          />
        )
      case 'match':
        return <MatchScreen session={screen.session} onExit={flow.exitMatch} />
    }
  }
}
