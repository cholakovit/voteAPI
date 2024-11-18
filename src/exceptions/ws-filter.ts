import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { WsBadRequestException } from './ws-exceptions';

@Catch()
export class WsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const socket: SocketWithAuth = host.switchToWs().getClient();

    if (exception instanceof BadRequestException) {
      const exceptionData = exception.getResponse();

      const wsException = new WsBadRequestException(
        exceptionData['message'] ?? 'Bad Request',
      );
      socket.emit('exception', wsException.getError());
      return;
    }

    throw new Error('Not implemented');
  }
}
