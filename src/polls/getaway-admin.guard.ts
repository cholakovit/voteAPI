import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PollsService } from './polls.service';
import { JwtService } from '@nestjs/jwt';
import { WsUnauthorizedException } from 'src/exceptions/ws-exceptions';

@Injectable()
export class GetawayAdminGuard implements CanActivate {
  private readonly logger = new Logger(GetawayAdminGuard.name);

  constructor(
    private readonly pollsService: PollsService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket: SocketWithAuth = context.switchToWs().getClient();

    const token =
      socket.handshake.auth?.token || socket.handshake.headers['token'];

    if (!token) {
      this.logger.error('No auth token provided');
      throw new WsUnauthorizedException('No auth token provided');
    }

    try {
      const payload = this.jwtService.verify<AuthPayload & { sub: string }>(
        token,
      );

      const decoded = this.jwtService.decode(token);
      this.logger.debug(`Decoded token payload: ${JSON.stringify(decoded)}`);

      this.logger.debug(`Validating admin using token payload: ${payload}`);

      const { sub, pollID } = payload;

      const poll = await this.pollsService.getPoll(pollID);

      if (sub !== poll.adminID) {
        throw new WsUnauthorizedException('Invalid token');
      }

      return true;
    } catch {
      throw new WsUnauthorizedException('Unsufficient privileges');
    }
  }
}
