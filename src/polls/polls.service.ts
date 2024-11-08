import { Injectable } from '@nestjs/common';
import { createPollID, createUserID } from 'src/utils/ids';

@Injectable()
export class PollsService {
  async createPoll(fields: CreatePollFields) {
    const pollID = createPollID();
    const userID = createUserID();

    return {
      ...fields,
      userID,
      pollID,
    };
  }

  async joinPoll(fields: JoinPollFields) {
    const userID = createUserID();

    return {
      ...fields,
      userID,
    };
  }

  async rejoinPoll(fields: RejoinPollFields) {
    return fields;
  }
}
