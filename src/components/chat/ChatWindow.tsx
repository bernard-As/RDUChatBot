import React, { useEffect, useRef } from 'react';
import type { Message } from '../../types/chat';
import { ChatMessage } from './ChatMessage';

interface ChatWindowProps {
  messages: Message[];
  className?: string;
}

export function ChatWindow({ messages, className = '' }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]); // Scroll whenever messages update

  return (
    <div className={`flex-grow overflow-y-auto p-4 space-y-2 bg-slate-800 ${className}`}>
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-400">No messages yet. Start by saying hello!</p>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
    </div>
  );
}