import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CreatePollsDto, JoinPollDto } from './dtos';
import { PollsService } from './polls.service';
import { ControllerAuthGuard } from './controller-auth.guard';

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

  @UseGuards(ControllerAuthGuard)
  @Post('/rejoin')
  async rejoin(@Req() request: RequestWithAuth) {
    const { userID, pollID, name } = request;
    const result = await this.pollsService.rejoinPoll({
      name,
      pollID,
      userID,
    });

    return result;
  }
}
