import { Module } from '@nestjs/common'
import { createDefaultWeaponRegistry, randomSeed } from '@tank-tussle/game-core'
import { MatchesService } from './matches.service.js'
import { SEED_SOURCE, WEAPON_REGISTRY } from './tokens.js'

@Module({
  providers: [
    MatchesService,
    { provide: WEAPON_REGISTRY, useFactory: createDefaultWeaponRegistry },
    { provide: SEED_SOURCE, useValue: randomSeed },
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
