import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
//import { Request } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';
declare global {
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

  type Poll = {
    id: string;
    topic: string;
    votesPerVoter: number;
    participants: Participants;
    adminID: string;
  };
}
