import { customAlphabet, nanoid } from 'nanoid';

export const createPollID = customAlphabet('1234567890abcdef', 6);

export const createUserID = () => nanoid();
export const createNominationID = () => nanoid(8);
