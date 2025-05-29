export interface LlamaModel {
  id: string;
  name: string;
  url: string; // Full URL to the /completion endpoint
  // We can add more model-specific config here later (e.g., prompt template)
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system'; // 'system' can be for errors or RAG info
  text: string;
  timestamp: Date;
  isLoading?: boolean; // For AI message while waiting for response
  isError?: boolean; // If AI response failed
}
export type MessageRole = 'user' | 'assistant' | 'system' | 'error' | 'loading';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  // Optional: for future use, e.g., if we show RAG sources
  // sources?: Array<{ title: string; url: string }>;
}

export interface Conversation {
  id: string;
  title: string; // e.g., "Chat about Vite" or "Untitled - 2023-10-27 10:30"
  messages: Message[];
  createdAt: Date;
  lastUpdatedAt: Date;
  modelId: string; // The ID of the LlamaModel used for this conversation
}