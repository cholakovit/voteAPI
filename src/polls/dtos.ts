import { IsInt, IsString, Length, Min, Max } from 'class-validator';

export class CreatePollsDto {
  @IsString()
  @Length(1, 100)
  topic: string;

  @IsInt()
  @Min(1)
  @Max(5)
  votesPerVoter: number;

  @IsString()
  @Length(1, 25)
  name: string;
}

export class JoinPollDto {
  @IsString()
  @Length(6, 6)
  pollID: string;

  @IsString()
  @Length(1, 25)
  name: string;
}

export class NominationDto {
  @IsString()
  @Length(6, 6)
  userID: string;

  @IsString()
  @Length(1, 75)
  text: string;
}
