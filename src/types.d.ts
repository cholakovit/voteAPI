import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
//import { Request } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';
declare global {
  type WsExceptionType = 'BadRequest' | 'Unauthorized' | 'Unknown';

  type AuthPayload = {
    userID: string;
    pollID: string;
    name: string;
  };

  type RequestWithAuth = Request & AuthPayload;
  type SocketWithAuth = Socket & AuthPayload;

  type RejoinPollFields = {
    pollID: string;
    userID: string;
    name: string;
  };

  type JoinPollFields = {
    pollID: string;
    name: string;
  };

  type CreatePollFields = {
    topic: string;
    votesPerVoter: number;
    name: string;
  };

  type RejoinPollFields = {
    pollID: string;
    userID: string;
    name: string;
  };

  type AddParticipantFields = {
    pollID: string;
    userID: string;
    name: string;
  };

  type CreatePollData = {
    pollID: string;
    topic: string;
    votesPerVoter: number;
    userID: string;
  };

  type AddParticipantData = {
    pollID: string;
    userID: string;
    name: string;
  };

  type RedisModuleOptions = {
    connectionOptions: RedisOptions;
    onClientReady?: (client: Redis) => void;
  };

  type RedisAsyncModuleOptions = {
    useFactory: (
      ...args: any[]
    ) => Promise<RedisModuleOptions> | RedisModuleOptions;
  } & Pick<ModuleMetadata, 'imports'> &
    Pick<FactoryProvider, 'inject'>;

  type Participants = {
    [participantID: string]: string;
  };

  type AddNominationData = {
    pollID: string;
    nominationID: string;
    nomination: Nomination;
  };

  type AddNominationFields = {
    pollID: string;
    userID: string;
    text: string;
  };

  type Nomination = {
    userID: string;
    text: string;
  };

  // type Nominations = {
  //   [nominationID: string]: Nomination;
  // };

  type Nominations = {
    [nominationID: NominationID]: Nomination;
  };

  type Rankings = {
    [userID: string]: number;
  };

  type AddParticipandRankingData = {
    pollID: string;
    userID: string;
    rankings: string[];
  };

  type SubmitRankingsFields = {
    pollID: string;
    userID: string;
    rankings: string[];
  };

  type Results = Array<{
    nominationID: NominationID;
    nominationText: string;
    score: number;
  }>;

  type Poll = {
    id: string;
    topic: string;
    votesPerVoter: number;
    participants: Participants;
    adminID: string;
    hasStarted: boolean;
    nominations: Nominations;
    rankings: Rankings;
    results: Results;
  };
}
