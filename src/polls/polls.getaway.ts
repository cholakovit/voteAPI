import { Logger } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { PollsService } from './polls.service';

@WebSocketGateway({
  namespace: 'polls',
  cors: {
    origin: '*',
  },
})
export class PollsGetaway implements OnGatewayInit {
  private readonly logger = new Logger(PollsGetaway.name);
  constructor(private readonly pollsService: PollsService) {}

  afterInit() {
    this.logger.log(`Websocket Getaway initialized.`);
  }
}
