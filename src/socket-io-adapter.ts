import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';

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

    const jwtService = this.app.get(JwtService);
    const server: Server = super.createIOServer(port, optionsWithCors);

    server.of('polls').use(this.createTokenMiddleware(jwtService, this.logger));

    return server;
  }

  createTokenMiddleware =
    (jwtService: JwtService, logger: Logger) =>
    (socket: SocketWithAuth, next) => {
      const rawToken =
        socket.handshake.query.token ||
        socket.handshake.headers['token'] ||
        socket.handshake.auth?.token;

      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

      if (!token) {
        logger.error('Token not provided');
        return next(new Error('Token not provided'));
      }

      logger.debug(`Validating auth token before connection: ${token}`);

      try {
        const payload = jwtService.verify(token);

        // Validate the payload structure
        if (!payload.sub || !payload.pollID || !payload.name) {
          throw new Error('Invalid token structure');
        }

        // Attach payload data to the socket
        socket.userID = payload.sub;
        socket.pollID = payload.pollID;
        socket.name = payload.name;

        next(); // Allow the connection
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          logger.error('Token expired');
          next(new Error('Token expired'));
        } else {
          logger.error(`Token validation failed: ${err.message}`);
          next(new Error('Invalid token'));
        }
      }
    };
}
