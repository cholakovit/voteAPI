import {
  BadRequestException,
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
import { NominationDto } from './dtos';
import { validate } from 'class-validator';

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
    //const sockets = this.io.sockets;
    // const { pollID, userID } = client;

    const roomName = client.pollID;
    await client.join(roomName);

    const connectedClients = this.io.adapter.rooms?.get(roomName)?.size ?? 0;

    this.logger.debug(
      `userID: ${client.userID} joined room with name: ${roomName}`,
    );
    this.logger.debug(
      `Total clients connected to room: '${roomName}': '${connectedClients}'`,
    );

    const updatedPoll = await this.pollsService.addParticipant({
      pollID: client.pollID,
      userID: client.userID,
      name: client.name,
    });

    this.io.to(roomName).emit('poll_updated', updatedPoll);
  }

  async handleDisconnect(client: SocketWithAuth) {
    const sockets = this.io.sockets;
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

  @SubscribeMessage('nominate')
  async nominate(
    @MessageBody() rawPayload: any,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    let parsedPayload: any;
    try {
      parsedPayload =
        typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      console.error('Invalid JSON payload: ', rawPayload);
      throw new Error('Invalid payload');
    }

    const nomination = new NominationDto();
    nomination.text = parsedPayload.text;

    const error = await validate(nomination, { skipMissingProperties: false });
    if (error.length > 0) {
      console.error('Validation error:', error);
      throw new Error('Invalid payload');
    }

    console.debug(
      `Attempting to add nomination for user ${client.userID} to poll ${client.pollID}\n${nomination.text}`,
    );

    const updatedPoll = await this.pollsService.addNomination({
      pollID: client.pollID,
      userID: client.userID,
      text: nomination.text,
    });

    this.io.to(client.pollID).emit('update_poll', updatedPoll);
  }

  @UseGuards(GetawayAdminGuard)
  @SubscribeMessage('remove_nomination')
  async removeNomination(
    @MessageBody('id') nominationID: string,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    this.logger.debug(
      `Attempting to remove nomination with nominationID: ${nominationID} from pollID: ${client.pollID}`,
    );

    const updatedPoll = await this.pollsService.removeNomination(
      client.pollID,
      nominationID,
    );

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  @UseGuards(GetawayAdminGuard)
  @SubscribeMessage('start_vote')
  async startVote(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Attempting to start vote for pollID: ${client.pollID}`);

    const updatedPoll = await this.pollsService.startPoll(client.pollID);

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  @SubscribeMessage('submit_rankings')
  async submitRankings(
    @ConnectedSocket() client: SocketWithAuth,
    @MessageBody() rawPayload: any, // Raw payload as string
  ): Promise<void> {
    // Parse the payload
    const payload =
      typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

    this.logger.debug(`Parsed payload: ${JSON.stringify(payload)}`);

    // Extract rankings from payload
    const rankings = payload.data?.rankings;

    if (!rankings || rankings.length === 0) {
      this.logger.error('Rankings are undefined or empty.');
      throw new BadRequestException('Rankings cannot be empty.');
    }

    this.logger.debug(
      `Attempting to submit rankings for pollID: ${client.pollID}`,
    );

    const poll = await this.pollsService.getPoll(client.pollID);

    if (!poll.hasStarted) {
      this.logger.warn(`Poll with ID ${client.pollID} has not started yet.`);
      throw new BadRequestException(
        'Participants cannot rank until the poll has started.',
      );
    }

    const updatedPoll = await this.pollsService.submitRankings({
      pollID: client.pollID,
      userID: client.userID,
      rankings,
    });

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  @UseGuards(GetawayAdminGuard)
  @SubscribeMessage('close_poll')
  async closePoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Closing poll: ${client.pollID} and computing results`);

    const updatedPoll = await this.pollsService.computeResults(client.pollID);

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  async cancelPoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
    this.logger.debug(`Cancelling poll: ${client.pollID}`);

    await this.pollsService.cancelPoll(client.pollID);

    this.io.to(client.pollID).emit('poll_cancelled');
  }
}
