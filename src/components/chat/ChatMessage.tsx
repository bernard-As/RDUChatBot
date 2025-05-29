import { motion } from 'framer-motion';
import type { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
}

// Helper to format timestamp
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';
  const isSystem = message.sender === 'system';

  // Base classes
  let containerClasses = "max-w-[85%] md:max-w-[75%] p-3 rounded-xl mb-2 clear-both";
  let textClasses = "text-sm md:text-base whitespace-pre-wrap break-words"; // pre-wrap for newlines

  if (isUser) {
    containerClasses += " bg-blue-600 text-white float-right rounded-br-none";
  } else if (isAI) {
    containerClasses += " bg-slate-700 text-slate-100 float-left rounded-bl-none";
    if (message.isLoading) {
      textClasses += " italic text-slate-400";
    }
    if (message.isError) {
      containerClasses += " bg-red-700 border border-red-500";
      textClasses += " text-red-100";
    }
  } else if (isSystem) {
    containerClasses = "w-full text-center my-2 clear-both"; // Full width for system messages
    textClasses = "text-xs text-slate-400 italic px-2 py-1 bg-slate-800 rounded-md inline-block";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full flow-root" // Use flow-root to contain floats
    >
      <div className={containerClasses}>
        <p className={textClasses}>
          {message.isLoading ? 'Thinking...' : message.text}
          {isAI && message.text && !message.isLoading && <span className="inline-block w-2 h-3 bg-current animate-pulse ml-1 rounded-full"></span>} {/* Typing cursor for AI final */}
        </p>
        {!isSystem && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'} ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </motion.div>
  );
}