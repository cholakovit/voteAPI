import { Body, Controller, Post } from '@nestjs/common';
import { CreatePollsDto, JoinPollDto } from './dtos';
import { PollsService } from './polls.service';

@Controller('polls')
export class PollsController {
  constructor(private pollsService: PollsService) {}

  @Post()
  async create(@Body() createPollsDto: CreatePollsDto) {
    const result = await this.pollsService.createPoll(createPollsDto);
    return result;
  }

  @Post('/join')
  async join(@Body() joinPollDto: JoinPollDto) {
    const result = await this.pollsService.joinPoll(joinPollDto);
    return result;
  }

  @Post('/rejoin')
  async rejoin() {
    const result = await this.pollsService.rejoinPoll({
      name: 'From token',
      pollID: 'also from a token',
      userID: 'also from a token',
    });

    return result;
  }
}
