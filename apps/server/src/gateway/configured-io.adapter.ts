import type { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import type { Server, ServerOptions } from 'socket.io'
import type { AppConfig } from '../config/app-config.js'

/** Applies runtime configuration (CORS, message size limit) to the Socket.IO server. */
export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: AppConfig,
  ) {
    super(app)
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const configured = {
      ...options,
      cors: { origin: this.config.corsOrigin, methods: ['GET', 'POST'] },
      // Bigger messages are dropped before they are parsed; game messages are tiny.
      maxHttpBufferSize: this.config.limits.maxPayloadBytes,
    } as ServerOptions
    return super.createIOServer(port, configured)
  }
}
