declare type CreatePollFields = {
  topic: string;
  votesPerVoter: number;
  name: string;
};

declare type JoinPollFields = {
  pollID: string;
  name: string;
};

declare type RejoinPollFields = {
  pollID: string;
  userID: string;
  name: string;
};
