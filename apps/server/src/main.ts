import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { APP_CONFIG, type AppConfig } from './config/app-config.js'
import { ConfiguredIoAdapter } from './gateway/configured-io.adapter.js'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule)
  const config = app.get<AppConfig>(APP_CONFIG)

  app.enableCors({ origin: config.corsOrigin })
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, config))
  app.enableShutdownHooks()

  await app.listen(config.port)
  Logger.log(`Tank Tussle server listening on port ${config.port}`, 'Bootstrap')
}

void bootstrap()
