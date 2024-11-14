import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ControllerAuthGuard implements CanActivate {
  private readonly logger = new Logger(ControllerAuthGuard.name);
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.debug(`Check for auth token on request body: ${request.body}`);

    const { accessToken } = request.body;

    try {
      const payload = this.jwtService.verify(accessToken);

      request.userID = payload.userID;
      request.pollID = payload.pollID;
      request.name = payload.name;
    } catch {
      throw new ForbiddenException('Invalid token');
    }

    return true;
  }
}
