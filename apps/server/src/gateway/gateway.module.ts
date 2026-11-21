import { Module } from '@nestjs/common'
import { MatchesModule } from '../matches/matches.module.js'
import { RoomsModule } from '../rooms/rooms.module.js'
import { LobbyGateway } from './lobby.gateway.js'
import { MatchGateway } from './match.gateway.js'

@Module({
  imports: [RoomsModule, MatchesModule],
  providers: [LobbyGateway, MatchGateway],
})
export class GatewayModule {}
