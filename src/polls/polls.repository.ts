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
      nominations: {},
      rankings: {},
      results: [],
      adminID: userID,
      hasStarted: false,
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

  async startPoll(pollID: string): Promise<Poll> {
    this.logger.log(`setting hasStarted for poll: ${pollID}`);

    const key = `polls:${pollID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, '.hasStarted', JSON.stringify(true)]),
      );

      return this.getPoll(pollID);
    } catch (e) {
      this.logger.error(`Failed set hasStarted for poll: ${pollID}`, e);
      throw new InternalServerErrorException(
        `The was an error starting the poll`,
      );
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

    const key = `polls:${pollID}`;
    const participantsPath = `.participants`;

    try {
      // Ensure the base structure of the poll exists
      const pollExists = await this.redisClient.sendCommand(
        new Command('JSON.GET', [key]),
      );

      if (!pollExists) {
        this.logger.error(`Poll with ID: ${pollID} does not exist in Redis.`);
        throw new Error(`Poll with ID: ${pollID} does not exist.`);
      }

      // Ensure the `participants` path exists
      const participants = await this.redisClient.sendCommand(
        new Command('JSON.GET', [key, participantsPath]),
      );

      if (!participants) {
        // If `participants` doesn't exist, create it as an empty object
        await this.redisClient.sendCommand(
          new Command('JSON.SET', [key, participantsPath, '{}']),
        );
      }

      // Add the new participant
      const participantPath = `.participants.${userID}`;
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, participantPath, JSON.stringify(name)]),
      );

      return this.getPoll(pollID); // Fetch and return the updated poll
    } catch (e) {
      this.logger.error(
        `Failed to add participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
      );
      throw e;
    }
  }

  async removeParticipant(pollID: string, userID: string): Promise<Poll> {
    this.logger.log(`removing userID: ${userID} from poll: ${pollID}`);

    const key = `polls:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, participantPath]),
      );

      return this.getPoll(pollID);
    } catch (e) {
      this.logger.error(
        `Failed to remove userID: ${userID} from poll: ${pollID}`,
        e,
      );
      throw new InternalServerErrorException(`Failed to remove participant`);
    }
  }
}
