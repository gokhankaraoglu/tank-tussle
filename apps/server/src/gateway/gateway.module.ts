import { Module } from '@nestjs/common'
import { ChatGateway } from '../chat/chat.gateway.js'
import { MatchesModule } from '../matches/matches.module.js'
import { GameEventLogger } from '../observability/game-event-logger.js'
import { ConnectionGuardGateway } from '../protection/connection-guard.gateway.js'
import { RoomsModule } from '../rooms/rooms.module.js'
import { LobbyGateway } from './lobby.gateway.js'
import { MatchGateway } from './match.gateway.js'

@Module({
  imports: [RoomsModule, MatchesModule],
  providers: [GameEventLogger, ConnectionGuardGateway, LobbyGateway, MatchGateway, ChatGateway],
})
export class GatewayModule {}
