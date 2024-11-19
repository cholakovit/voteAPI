import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
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
import { GetawayAdminGuard } from './getaway-admin.guard';

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

  async handleConnection(client: SocketWithAuth) {
    const sockets = this.io.sockets;
    // const { pollID, userID } = client;

    // const updatedPoll = await this.pollsService.removeParticipant(
    //   pollID,
    //   userID,
    // );

    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}`,
    );

    this.logger.log(`WS Client with id: ${client.id} connected.`);
    this.logger.debug(`Number of connected sockeets: ${sockets.size}`);

    //this.io.emit('hello', `from ${client.id}`);
    const roomName = client.pollID;
    await client.join(roomName);

    const connectedClients = this.io.adapter.rooms?.get(roomName)?.size ?? 0;

    this.logger.debug(
      `userID: ${client.userID} joined room with name: ${roomName}`,
    );
    this.logger.debug(
      `Total clients connected to room: '${roomName}': '${connectedClients}'`,
    );
  }

  async handleDisconnect(client: SocketWithAuth) {
    const sockets = this.io.sockets;

    // this.logger.debug(
    //   `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}`,
    // );

    // this.logger.log(`Disconnected socket id: ${client.id}`);
    // this.logger.debug(`Number of connected sockeets: ${sockets.size}`);
    const { pollID, userID } = client;

    const updatePoll = await this.pollsService.removeParticipant(
      pollID,
      userID,
    );

    const roomName = client.pollID;
    const clientCount = this.io.adapter.rooms?.get(roomName)?.size ?? 0;
    this.logger.log(`Disconnected socket id: ${client.id}`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);
    this.logger.debug(
      `Total clients connected to room '${roomName}': ${clientCount}`,
    );

    if (updatePoll) {
      this.io.to(pollID).emit('poll_updated', updatePoll);
    }
  }

  @SubscribeMessage('test')
  async test() {
    throw new WsBadRequestException('Invalid empty data: ');
  }

  @UseGuards(GetawayAdminGuard)
  @SubscribeMessage('remove_participant')
  async removeParticipant(
    @MessageBody('id') id: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.debug(
      `Attempting to remove participant ${id} from poll ${client.pollID}`,
    );

    const updatedPoll = await this.pollsService.removeParticipant(
      client.pollID,
      id,
    );

    if (updatedPoll) {
      this.io.to(client.pollID).emit('update_poll', updatedPoll);
    }
  }
}
