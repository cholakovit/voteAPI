import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';

export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);
  constructor(
    private app: INestApplication,
    private configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    //const clientPort = parseInt(this.configService.get('CLIENT_PORT'));

    const cors = {
      origin: '*',
    };

    this.logger.log(`Creating SocketIO server on port ${port}`, { cors });

    const optionsWithCors = {
      ...options,
      cors,
    };

    return super.createIOServer(port, optionsWithCors);
  }
}
