import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PollsService } from './polls.service';
import { Namespace } from 'socket.io';
import { WsBadRequestException } from 'src/exceptions/ws-exceptions';
import { WsFilter } from 'src/exceptions/ws-filter';

@UsePipes(new ValidationPipe())
@UseFilters(new WsFilter())
@WebSocketGateway({
  namespace: 'polls',
  cors: {
    origin: '*',
  },
})
export class PollsGetaway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PollsGetaway.name);
  constructor(private readonly pollsService: PollsService) {}

  @WebSocketServer() io: Namespace;

  afterInit() {
    this.logger.log(`Websocket Getaway initialized.`);
  }

  handleConnection(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}`,
    );

    this.logger.log(`WS Client with id: ${client.id} connected.`);
    this.logger.debug(`Number of connected sockeets: ${sockets.size}`);

    this.io.emit('hello', `from ${client.id}`);
  }

  handleDisconnect(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}`,
    );

    this.logger.log(`Disconnected socket id: ${client.id}`);
    this.logger.debug(`Number of connected sockeets: ${sockets.size}`);
  }

  @SubscribeMessage('test')
  async test() {
    throw new WsBadRequestException('Invalid empty data: ');
  }
}
