import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module.js'
import { GatewayModule } from './gateway/gateway.module.js'
import { HealthController } from './health/health.controller.js'

@Module({
  imports: [ConfigModule, GatewayModule],
  controllers: [HealthController],
})
export class AppModule {}
