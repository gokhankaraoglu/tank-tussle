import { Module } from '@nestjs/common'
import { ReconnectionTimers } from './reconnection-timers.js'
import { InMemoryRoomRepository, ROOM_REPOSITORY } from './room.repository.js'
import { RoomsService } from './rooms.service.js'
import { APP_CONFIG, type AppConfig } from '../config/app-config.js'
import { CLOCK, ROOM_LIMIT } from './tokens.js'

@Module({
  providers: [
    RoomsService,
    ReconnectionTimers,
    { provide: ROOM_REPOSITORY, useClass: InMemoryRoomRepository },
    { provide: CLOCK, useValue: Date.now },
    {
      provide: ROOM_LIMIT,
      useFactory: (config: AppConfig) => config.limits.maxRooms,
      inject: [APP_CONFIG],
    },
  ],
  exports: [RoomsService, ReconnectionTimers],
})
export class RoomsModule {}
