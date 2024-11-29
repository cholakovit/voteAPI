import {
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
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

      const parsedPoll = JSON.parse(currentPoll);
      this.logger.debug(
        `Parsed poll object: ${JSON.stringify(parsedPoll, null, 2)}`,
      );

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
      const pollExists = await this.redisClient.sendCommand(
        new Command('JSON.GET', [key]),
      );

      if (!pollExists) {
        this.logger.error(`Poll with ID: ${pollID} does not exist in Redis.`);
        throw new Error(`Poll with ID: ${pollID} does not exist.`);
      }

      const participants = await this.redisClient.sendCommand(
        new Command('JSON.GET', [key, participantsPath]),
      );

      if (!participants) {
        await this.redisClient.sendCommand(
          new Command('JSON.SET', [key, participantsPath, '{}']),
        );
      }

      const participantPath = `.participants.${userID}`;
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, participantPath, JSON.stringify(name)]),
      );

      return this.getPoll(pollID);
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

  async addNomination({
    pollID,
    nominationID,
    nomination,
  }: AddNominationData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a nomination with nominationID/nomination: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
    );

    const key = `polls:${pollID}`;
    const nominationsPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [
          key,
          nominationsPath,
          JSON.stringify(nomination),
        ]),
      );
      return this.getPoll(pollID);
    } catch (e) {
      this.logger.error(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
        e,
      );
      throw new InternalServerErrorException(
        `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
      );
    }
  }

  async removeNomination(pollID: string, nominationID: string): Promise<Poll> {
    this.logger.log(
      `removing nominationID: ${nominationID} from poll: ${pollID}`,
    );

    const key = `polls:${pollID}`;
    const nominationsPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.DEL', [key, nominationsPath]),
      );

      return this.getPoll(pollID);
    } catch (e) {
      this.logger.error(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
        e,
      );
      throw new InternalServerErrorException(
        `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`,
      );
    }
  }

  async addParticipantRanking({
    pollID,
    userID,
    rankings,
  }: AddParticipandRankingData): Promise<Poll> {
    this.logger.log(
      `Attempting to add rankings for userID: ${userID} to pollID: ${pollID}`,
    );

    if (!rankings || rankings.length === 0) {
      this.logger.error('Rankings data is undefined or empty.');
      throw new BadRequestException('Rankings cannot be empty.');
    }

    const key = `polls:${pollID}`;
    const participantPath = `.rankings.${userID}`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [
          key,
          participantPath,
          JSON.stringify(rankings),
        ]),
      );

      return this.getPoll(pollID);
    } catch (error) {
      this.logger.error(
        `Failed to add rankings for userID: ${userID} to pollID: ${pollID} - Error: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'There was an error saving the rankings',
      );
    }
  }

  async addResults(pollID: string, results: Results): Promise<Poll> {
    this.logger.log(
      `Attempting to add results to pollID: ${pollID}`,
      JSON.stringify(results),
    );

    const key = `polls:${pollID}`;
    const resultsPath = `.results`;

    try {
      await this.redisClient.sendCommand(
        new Command('JSON.SET', [key, resultsPath, JSON.stringify(results)]),
      );

      return this.getPoll(pollID);
    } catch {
      this.logger.error(
        `Failed to add add results for pollID: ${pollID}`,
        results,
      );
      throw new InternalServerErrorException(
        `Failed to add add results for pollID: ${pollID}`,
      );
    }
  }

  async deletePoll(pollID: string): Promise<void> {
    const key = `polls:${pollID}`;

    this.logger.log(`Deleting poll: ${pollID}`);

    try {
      await this.redisClient.sendCommand(new Command('DEL', [key]));
    } catch {
      this.logger.error(`Failed to delete poll: ${pollID}`);
      throw new InternalServerErrorException(
        'There was an error deleting the poll',
      );
    }
  }
}
