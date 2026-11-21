import {
  initialScreen,
  screenMusic,
  useGameFlow,
  useLadderProgress,
  useProfile,
  type KeyValueStorage,
  type Screen,
} from '@tank-tussle/client-core'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createDependencies, DependenciesProvider, type Dependencies } from './app/dependencies'
import { useMusic } from './app/hooks'
import { MatchScreen } from './battle/MatchScreen'
import { loadDeviceStorage } from './platform/storage'
import { MainMenu } from './screens/MainMenu'
import { FriendScreen, LadderScreen, ProfileScreen, QuickMatchScreen } from './screens/menu-screens'
import { CreateRoom, OnlineHub } from './screens/OnlineLobby'
import { ResumeScreen, WaitingRoom } from './screens/OnlineRoom'
import { PlayerSetup } from './screens/PlayerSetup'
import { colors } from './theme'

/** A remembered seat means the app was closed mid-game: try to get back into it. */
const chooseFirstScreen = (dependencies: Dependencies): Screen =>
  dependencies.credentials.load()
    ? { name: 'resuming', connection: dependencies.openConnection() }
    : initialScreen

/** Reads the device storage once, then starts the game. */
export const App = () => {
  const [storage, setStorage] = useState<KeyValueStorage | null>(null)
  useEffect(() => {
    void loadDeviceStorage().then(setStorage)
  }, [])
  const dependencies = useMemo(() => (storage ? createDependencies(storage) : null), [storage])

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {dependencies && (
          <DependenciesProvider value={dependencies}>
            <Game dependencies={dependencies} />
          </DependenciesProvider>
        )}
      </View>
    </SafeAreaProvider>
  )
}

const Game = ({ dependencies }: { readonly dependencies: Dependencies }) => {
  const [firstScreen] = useState(() => chooseFirstScreen(dependencies))
  const flow = useGameFlow(dependencies, firstScreen)
  const profile = useProfile(dependencies.profile)
  const ladderBeaten = useLadderProgress(dependencies.ladder)
  const { screen } = flow

  useMusic(screenMusic(screen))

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
        <LadderScreen beaten={ladderBeaten} onChallenge={flow.challenge} onBack={flow.backToMenu} />
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
      return <ProfileScreen profile={profile} onSave={flow.saveProfile} onBack={flow.backToMenu} />
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
      return <PlayerSetup mode={screen.mode} onSubmit={flow.submitSetup} onBack={flow.backToMenu} />
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
