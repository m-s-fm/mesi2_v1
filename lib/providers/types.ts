export type Platform = 'twitter' | 'instagram' | 'messenger' | 'threads';

export interface Message {
  id: string;
  senderId: string;
  senderUsername?: string;
  senderName?: string;
  text: string;
  createdAt: string; // ISO String
  platform: Platform;
}

export interface Participant {
  id: string;
  username?: string;
  name?: string;
  avatarUrl?: string;
}

export interface Thread {
  id: string;
  participants: Participant[];
  lastMessage?: Message;
  messages: Message[];
  platform: Platform;
}

export interface MessageProvider {
  getThreads(nextToken?: string): Promise<{ threads: Thread[]; nextToken?: string }>;
  sendMessage(threadId: string, text: string): Promise<Message>;
}
