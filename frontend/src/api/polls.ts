import api from './axios';

export interface PollOption {
  index: number;
  text: string;
  voteCount: number;
  percentage: number;
  hasVoted: boolean;
  voters: string[];
}

export interface Poll {
  id: string;
  roomId: string;
  creatorId: string;
  creatorUsername: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  allowMultipleVotes: boolean;
  isAnonymous: boolean;
  isClosed: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export async function createPoll(data: {
  roomId: string;
  question: string;
  options: string[];
  allowMultipleVotes?: boolean;
  isAnonymous?: boolean;
  expiresInMinutes?: number;
}): Promise<Poll> {
  const { data: poll } = await api.post<Poll>('/polls', data);
  return poll;
}

export async function fetchPolls(roomId: string): Promise<Poll[]> {
  const { data } = await api.get<Poll[]>(`/polls/room/${roomId}`);
  return data;
}

export async function votePoll(pollId: string, optionIndex: number): Promise<Poll> {
  const { data } = await api.post<Poll>(`/polls/${pollId}/vote`, { optionIndex });
  return data;
}

export async function closePoll(pollId: string): Promise<Poll> {
  const { data } = await api.post<Poll>(`/polls/${pollId}/close`);
  return data;
}
