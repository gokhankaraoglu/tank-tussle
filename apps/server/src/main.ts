import 'reflect-metadata'
import { Logger, type LogLevel } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import {
  APP_CONFIG,
  loadAppConfig,
  type AppConfig,
  type LogLevelName,
} from './config/app-config.js'
import { ConfiguredIoAdapter } from './gateway/configured-io.adapter.js'

/** LOG_LEVEL picks the quietest level that is still shown. */
const LOG_LEVELS: Record<LogLevelName, LogLevel[]> = {
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
}

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    logger: LOG_LEVELS[loadAppConfig().logLevel],
  })
  const config = app.get<AppConfig>(APP_CONFIG)

  app.enableCors({ origin: config.corsOrigin })
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, config))
  app.enableShutdownHooks()

  await app.listen(config.port)
  Logger.log(`Tank Tussle server listening on port ${config.port}`, 'Bootstrap')
}

void bootstrap()
