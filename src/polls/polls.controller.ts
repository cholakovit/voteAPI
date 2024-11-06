import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CreatePollsDto } from './dtos';

@Controller('polls')
export class PollsController {
  @Post()
  async create(@Body() createPollsDto: CreatePollsDto) {
    Logger.log('This action adds a new poll');
    return createPollsDto;
  }

  @Post('/join')
  async join(@Body() createPollsDto: CreatePollsDto) {
    Logger.log('This action joins a poll');
    return createPollsDto;
  }

  @Post('/rejoin')
  async rejoin() {
    Logger.log('This action rejoins a poll');
  }
}
