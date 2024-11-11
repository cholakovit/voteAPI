import {
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Command } from 'ioredis';
import { IORedisKey } from 'src/redis.module';

@Injectable()
export class PollsRepository {
  private readonly ttl: string;
  private readonly logger = new Logger(PollsRepository.name);

  constructor(
    configService: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {
    this.ttl = configService.get('POLL_DURATION');
  }

  // async createPoll({
  //   votesPerVoter,
  //   topic,
  //   pollID,
  //   userID,
  // }: CreatePollData): Promise<Poll> {
  //   const initialPoll = {
  //     id: pollID,
  //     topic,
  //     votesPerVoter,
  //     participants: {},
  //     adminID: userID,
  //   };

  //   this.logger.log(
  //     `Creating new poll: ${JSON.stringify(initialPoll, null, 2)} with TTL: ${this.ttl}`,
  //   );

  //   const key = `polls:${pollID}`;

  //   try {
  //     await this.redisClient
  //       .multi([
  //         ['JSON.SET', key, '.', JSON.stringify(initialPoll)], // JSON.SET command in array format
  //         ['expire', key, this.ttl], // expire command in array format
  //       ])
  //       .exec();

  //     return initialPoll;
  //   } catch (error) {
  //     this.logger.error(`Error creating poll: ${error}`);
  //     throw new InternalServerErrorException();
  //   }
  // }

  async createPoll({
    votesPerVoter,
    topic,
    pollID,
    userID,
  }: CreatePollData): Promise<Poll> {
    const initialPoll = {
      id: pollID,
      topic,
      votesPerVoter,
      participants: {},
      adminID: userID,
    };

    this.logger.log(
      `Creating new poll: ${JSON.stringify(initialPoll, null, 2)} with TTL: ${this.ttl}`,
    );

    const key = `polls:${pollID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, '.', JSON.stringify(initialPoll)]),
      );

      const pipeline = this.redisClient.pipeline();
      pipeline.expire(key, this.ttl);
      await pipeline.exec();

      return initialPoll;
    } catch (error) {
      this.logger.error(`Error creating poll: ${error}`);
      throw new InternalServerErrorException();
    }
  }

  async getPoll(pollID: string): Promise<Poll> {
    this.logger.log(`Attempting to get poll with ${pollID}`);

    const key = `polls:${pollID}`;

    try {
      const currentPoll = (await this.redisClient.sendCommand(
        new Command('JSON.GET', [key, '.']),
      )) as string;

      this.logger.verbose(currentPoll);

      return JSON.parse(currentPoll);
    } catch (e) {
      this.logger.error(`Failed to get pollID ${pollID}`);
      throw e;
    }
  }

  async addParticipant({
    pollID,
    userID,
    name,
  }: AddParticipantData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
    );

    const key = `polls: ${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, participantPath, JSON.stringify(name)]),
      );

      const pollJSON = await this.redisClient.sendCommand(
        new Command('JSON.GET', [key, '.']),
      );

      const poll = JSON.parse(pollJSON as string) as Poll;

      this.logger.debug(
        `Current Participants for pollID: ${pollID}`,
        poll.participants,
      );

      return poll;
    } catch (e) {
      this.logger.error(
        `Failed to add participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
      throw e;
    }
  }
}