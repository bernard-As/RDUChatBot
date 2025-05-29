import type { Conversation } from '../../types/chat';
import { motion, AnimatePresence } from 'framer-motion'; // For animations

interface ConversationHistoryPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  className?: string;
}

export function ConversationHistoryPanel({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  className = '',
}: ConversationHistoryPanelProps) {
  return (
    <div className={`bg-slate-800 p-4 border-r border-slate-700 flex flex-col ${className}`}>
      <button
        onClick={onNewChat}
        className="w-full mb-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Chat
      </button>
      <h2 className="text-xs text-slate-400 uppercase font-semibold mb-2 px-1">History</h2>
      <div className="flex-grow overflow-y-auto space-y-1 pr-1 -mr-1"> {/* Custom scrollbar might be nice here */}
        <AnimatePresence>
          {conversations.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-500 text-sm px-1"
            >
              No conversations yet.
            </motion.p>
          )}
          {conversations.map((convo) => (
            <motion.div
              key={convo.id}
              layout // Animates layout changes (e.g., when an item is deleted)
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors duration-150 ease-in-out
                ${currentConversationId === convo.id
                  ? 'bg-indigo-500 text-white'
                  : 'hover:bg-slate-700 text-slate-300 hover:text-slate-100'
                }`}
              onClick={() => onSelectConversation(convo.id)}
            >
              <span className="truncate text-sm">{convo.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent selecting conversation when deleting
                  onDeleteConversation(convo.id);
                }}
                className={`ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                  ${currentConversationId === convo.id ? 'text-indigo-100 hover:text-white hover:bg-indigo-600' : 'text-slate-400 hover:text-red-500 hover:bg-slate-600'}`}
                aria-label="Delete conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}