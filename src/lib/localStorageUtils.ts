import type { Conversation, Message } from '../types/chat';

const CONVERSATIONS_KEY = 'chatConversations';

// Helper to parse dates, as JSON.stringify turns Dates into strings
const mapMessageDates = (messages: any[]): Message[] => {
  return messages.map(msg => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
};

const mapConversationDates = (conversation: any): Conversation => ({
  ...conversation,
  messages: mapMessageDates(conversation.messages || []),
  createdAt: new Date(conversation.createdAt),
  lastUpdatedAt: new Date(conversation.lastUpdatedAt),
});

export function loadConversations(): Conversation[] {
  try {
    const storedConversations = localStorage.getItem(CONVERSATIONS_KEY);
    if (storedConversations) {
      const parsed = JSON.parse(storedConversations) as any[];
      return parsed.map(mapConversationDates).sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime()); // Newest first
    }
  } catch (error) {
    console.error("Error loading conversations from localStorage:", error);
  }
  return [];
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    // Ensure timestamps are properly stringified by JSON.stringify
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Error saving conversations to localStorage:", error);
  }
}