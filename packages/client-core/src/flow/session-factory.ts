import type { WeaponRegistry } from '@tank-tussle/game-core'
import { LocalGameSession } from '../session/local-game-session.js'
import { cpu, HUMAN, IDLE, type PlayerController } from '../session/player-controller.js'
import type { GameSession } from '../session/game-session.js'
import type { MatchSetup } from './match-setup.js'

const controllersFor = (setup: MatchSetup): readonly [PlayerController, PlayerController] => {
  switch (setup.mode) {
    case 'cpu':
      return [HUMAN, cpu(setup.cpuLevel)]
    case 'practice':
      return [HUMAN, IDLE]
    case 'hot-seat':
      return [HUMAN, HUMAN]
    case 'online':
      throw new Error('Online sessions are created by the lobby')
  }
}

export const createLocalSession = (setup: MatchSetup, registry: WeaponRegistry): GameSession =>
  new LocalGameSession({
    match: { mode: setup.mode === 'practice' ? 'practice' : 'versus', players: setup.players },
    controllers: controllersFor(setup),
    registry,
  })
