import { Module } from '@nestjs/common'
import { ReconnectionTimers } from './reconnection-timers.js'
import { InMemoryRoomRepository, ROOM_REPOSITORY } from './room.repository.js'
import { RoomsService } from './rooms.service.js'
import { CLOCK } from './tokens.js'

@Module({
  providers: [
    RoomsService,
    ReconnectionTimers,
    { provide: ROOM_REPOSITORY, useClass: InMemoryRoomRepository },
    { provide: CLOCK, useValue: Date.now },
  ],
  exports: [RoomsService, ReconnectionTimers],
})
export class RoomsModule {}
