import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { jwtModule, redisModule } from 'src/modules.config';
import { PollsRepository } from './polls.repository';
import { PollsGetaway } from './polls.getaway';

@Module({
  imports: [ConfigModule, redisModule, jwtModule],
  controllers: [PollsController],
  providers: [PollsService, PollsRepository, PollsGetaway],
})
export class PollsModule {}
