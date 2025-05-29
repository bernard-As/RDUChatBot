import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LlamaModel, Message, Conversation } from '../types/chat';
import { ModelSelector } from '../components/chat/ModelSelector';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatInput } from '../components/chat/ChatInput';
import { ConversationHistoryPanel } from '../components/chat/ConversationHistoryPanel';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Link, } from 'react-router-dom'; // useParams and useNavigate for potential routing per chat
import { loadConversations, saveConversations } from '../lib/localStorageUtils';

// Constants (keep as before, or adjust)
const LLAMA_SERVER_URL_DEFAULT = 'https://timetable.rdu.edu.tr/test/ai/completion1'; // Example default
const MOCK_MODELS: LlamaModel[] = [
  { id: 'deepseek-coder-instruct', name: 'Deepseek Coder (Instruct)', url: LLAMA_SERVER_URL_DEFAULT },
  { id: 'llama2-7b', name: 'LLaMA 2 (7B)', url: 'https://timetable.rdu.edu.tr/test/ai/completion' },
  { id: 'gamma-7b', name: 'Gamma (7B)', url: 'https://timetable.rdu.edu.tr/test/ai/completion' },
  {
    id: 'hf-mistral-7b-instruct',
    name: 'Hugging Face - Mistral 7B Instruct',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    url: 'gemini'
  }
];


const SIMULATED_RESPONSE_DELAY_MS = 30;
const DEFAULT_N_PREDICT = 512;
const DEFAULT_TEMPERATURE = 0.7;
const STOP_SEQUENCES = ["\n[Question]", "\nUser:", "\nSystem:", "[/INST]"];

interface RagDocument {
  id: string;
  text: string;
  source?: string;
}

// fetchRagContext and formatLlamaPrompt can remain as they were (or move to a service file)
// For brevity, I'll assume they are defined as in your original code.
// (Make sure they are accessible here)
async function fetchRagContext(query: string): Promise<RagDocument[]> {
  console.log(`[RAG] Fetching context for query: "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 500));
  if (query.toLowerCase().includes("vite")) {
    return [
      { id: 'doc1', text: "Vite is a modern frontend build tool..." },
      { id: 'doc2', text: "Vite supports TypeScript, JSX, CSS Modules..." }
    ];
  }
  if (query.toLowerCase().includes("llama")) {
      return [
          { id: 'doc3', text: "LLaMA (Large Language Model Meta AI)..." },
          { id: 'doc4', text: "llama.cpp is a C/C++ port of LLaMA..."}
      ];
  }
  return [];
}

function formatLlamaPrompt(query: string, contextDocs: RagDocument[]): string {
  let contextText = "No relevant context found.";
  if (contextDocs.length > 0) {
    contextText = contextDocs.map(doc => doc.text).join("\n\n");
  }
  const prompt = `[Context]\n${contextText}\n[/Context]\n\n[Question]\n${query}\n[/Question]\n\n[Answer]\n`;
  console.log("[PROMPT] Formatted LLaMA Prompt:\n", prompt);
  return prompt;
}


export function ChatPage() {
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isOverallLoading, setIsOverallLoading] = useState(false); // For disabling input globally
  const [availableModels] = useState<LlamaModel[]>(MOCK_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(MOCK_MODELS[0]?.id || '');

  // const navigate = useNavigate(); // If you want to update URL with conversation ID

  // Load conversations on initial mount
  useEffect(() => {
    const loadedConversations = loadConversations();
    setAllConversations(loadedConversations);
    if (loadedConversations.length > 0) {
      // Optionally, load the most recent conversation or handle via URL param
      // For now, let's default to a new chat state or the most recent one
      setCurrentConversationId(loadedConversations[0]?.id || null);
      if (loadedConversations[0]) {
        setSelectedModelId(loadedConversations[0].modelId);
      }
    } else {
        handleNewChat(false); // Start a new chat if no history, without navigating
    }
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (allConversations.length > 0 || localStorage.getItem('chatConversations')) { // Avoid saving empty array initially if nothing was loaded
        saveConversations(allConversations);
    }
  }, [allConversations]);

  const currentConversation = useMemo(() => {
    return allConversations.find(c => c.id === currentConversationId) || null;
  }, [allConversations, currentConversationId]);

  const messages = useMemo(() => {
    return currentConversation?.messages || [];
  }, [currentConversation]);

  const currentModel = useMemo(() => {
    return availableModels.find(m => m.id === selectedModelId) || availableModels[0];
  }, [selectedModelId, availableModels]);


  const updateMessageInConversation = (convoId: string, messageId: string, updates: Partial<Message>) => {
    setAllConversations(prevConvos =>
      prevConvos.map(convo =>
        convo.id === convoId
          ? {
              ...convo,
              messages: convo.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              lastUpdatedAt: new Date(), // Update last activity time
            }
          : convo
      )
    );
  };

  const addMessageToConversation = (convoId: string, message: Message) => {
     setAllConversations(prevConvos =>
      prevConvos.map(convo =>
        convo.id === convoId
          ? {
              ...convo,
              messages: [...convo.messages, message],
              lastUpdatedAt: new Date(),
            }
          : convo
      ).sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime()) // Keep sorted
    );
  };

  const streamText = useCallback((conversationId: string, aiMessageId: string, fullText: string, onComplete?: () => void) => {
    let charIndex = 0;
    updateMessageInConversation(conversationId, aiMessageId, { text: '', isLoading: true, isError: false });

    const intervalId = setInterval(() => {
      updateMessageInConversation(conversationId, aiMessageId, { text: fullText.substring(0, charIndex + 1) });
      charIndex++;
      if (charIndex >= fullText.length) {
        clearInterval(intervalId);
        updateMessageInConversation(conversationId, aiMessageId, { isLoading: false });
        if (onComplete) onComplete();
      }
    }, SIMULATED_RESPONSE_DELAY_MS);
  }, []); // Dependencies: updateMessageInConversation if it's not stable via useCallback

  const handleNewChat = (navigateUser = true) => {
    // Doesn't create the conversation object until the first message is sent.
    // It just sets the state to reflect a "new chat" UI.
    setCurrentConversationId(null); // This signifies a new chat state
    // Reset messages visually for new chat (messages derive from currentConversationId)
    // Optionally, set a default model for new chats
    setSelectedModelId(MOCK_MODELS[0]?.id || '');
    // If you use URL-based routing for chats: navigate('/chat');
    // Add a default system message for a brand new chat session if desired
    // This might be handled by ChatWindow if currentConversation is null
    if (navigateUser) {
        // Potentially navigate to a base /chat URL if you use /chat/:id
        // navigate("/chat");
    }
  };

  const handleSelectConversation = (id: string) => {
    const selectedConvo = allConversations.find(c => c.id === id);
    if (selectedConvo) {
      setCurrentConversationId(id);
      setSelectedModelId(selectedConvo.modelId);
      // If you use URL-based routing for chats: navigate(`/chat/${id}`);
    }
  };

  const handleDeleteConversation = (id: string) => {
    setAllConversations(prevConvos => prevConvos.filter(c => c.id !== id));
    if (currentConversationId === id) {
      // If deleting the current chat, switch to new chat mode or most recent
      const remainingConversations = allConversations.filter(c => c.id !== id);
      if (remainingConversations.length > 0) {
        handleSelectConversation(remainingConversations.sort((a,b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSendMessage = async (inputText: string) => {
  if (!inputText.trim() || !currentModel) return;
  setIsOverallLoading(true);

  let activeConversationId = currentConversationId;

  if (!activeConversationId) {
    const newConvoId = uuidv4();
    const newConversation: Conversation = {
      id: newConvoId,
      title: inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''),
      messages: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      modelId: selectedModelId,
    };
    setAllConversations(prev => [newConversation, ...prev].sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime()));
    setCurrentConversationId(newConvoId);
    activeConversationId = newConvoId;
  }

  const userMessage: Message = {
    id: uuidv4(),
    sender: 'user',
    text: inputText,
    timestamp: new Date(),
  };
  addMessageToConversation(activeConversationId, userMessage);

  const aiMessageId = uuidv4();
  const placeholderAiMessage: Message = {
    id: aiMessageId,
    sender: 'ai',
    text: '',
    timestamp: new Date(),
    isLoading: true,
  };
  addMessageToConversation(activeConversationId, placeholderAiMessage);

  try {
    let contextDocs: RagDocument[] = [];
    try {
      contextDocs = await fetchRagContext(inputText);
      if (contextDocs.length === 0) {
        addMessageToConversation(activeConversationId, {
          id: uuidv4(), sender: 'system', text: "No context found. Using general model knowledge.", timestamp: new Date()
        });
      }
    } catch (e: any) {
      addMessageToConversation(activeConversationId, {
        id: uuidv4(), sender: 'system', text: `RAG Error: ${e.message}`, timestamp: new Date()
      });
    }

    const formattedPrompt = formatLlamaPrompt(inputText, contextDocs);

    const isHuggingFaceModel = currentModel.id.startsWith('hf-');
    const isGemini = currentModel.id === 'gemini-flash';

    const llamaResponse = await fetch(
      isGemini
        ? `${currentModel.url}?key=${import.meta.env.VITE_GEMINI_API_KEY}`
        : currentModel.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isHuggingFaceModel && {
            Authorization: `Bearer ${import.meta.env.VITE_HF_API_KEY}`,
          }),
        },
        body: JSON.stringify(
          isGemini
            ? {
                contents: [
                  {
                    parts: [{ text: formattedPrompt }],
                  },
                ],
              }
            : isHuggingFaceModel
              ? {
                  inputs: formattedPrompt,
                  parameters: {
                    temperature: DEFAULT_TEMPERATURE,
                    max_new_tokens: DEFAULT_N_PREDICT,
                    return_full_text: false,
                  },
                }
              : {
                  prompt: formattedPrompt,
                  n_predict: DEFAULT_N_PREDICT,
                  temperature: DEFAULT_TEMPERATURE,
                  stop: STOP_SEQUENCES,
                }
        ),
      }
    );

    if (!llamaResponse.ok) {
      const errorBody = await llamaResponse.text();
      throw new Error(`LLaMA/Gemini server error: ${llamaResponse.status}. Body: ${errorBody}`);
    }

    const llamaData = await llamaResponse.json();
    let aiResponseText = '';

    if (isGemini) {
      aiResponseText =
        llamaData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (isHuggingFaceModel) {
      aiResponseText = Array.isArray(llamaData)
        ? llamaData[0]?.generated_text?.trim() || ''
        : llamaData.generated_text?.trim() || '';
    } else {
      aiResponseText = llamaData.response?.trim() || llamaData.text?.trim() || '';
    }

    if (!aiResponseText) throw new Error("The model returned an empty response.");

    streamText(activeConversationId, aiMessageId, aiResponseText, () => {
      setIsOverallLoading(false);
    });

  } catch (error: any) {
    console.error("Error in handleSendMessage:", error);
    updateMessageInConversation(activeConversationId, aiMessageId, {
      text: `Error: ${error.message || "Failed to get AI response."}`,
      isLoading: false,
      isError: true,
    });
    setIsOverallLoading(false);
  }
};


  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    if (currentConversationId) {
      // Update the model for the current conversation
      setAllConversations(prevConvos =>
        prevConvos.map(c =>
          c.id === currentConversationId ? { ...c, modelId: modelId, lastUpdatedAt: new Date() } : c
        ).sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
      );
      // Add a system message about model switch
      addMessageToConversation(currentConversationId, {
        id: uuidv4(),
        sender: 'system',
        text: `Switched to model: ${availableModels.find(m => m.id === modelId)?.name || 'Unknown'}`,
        timestamp: new Date()
      });
    }
    // If no current conversation, this model will be used for the next new chat
  };

  // Initial system message if no conversation is selected and no messages exist
  // This is slightly different from your original useEffect logic
  const displayMessages = useMemo(() => {
    if (!currentConversation && messages.length === 0) {
        return [{
            id: uuidv4(),
            sender: 'system',
            text: `Welcome! Select a model and start a new chat, or choose a conversation from the history. Current model: ${currentModel.name}.`,
            timestamp: new Date()
        } as Message];
    }
    return messages;
  }, [messages, currentConversation, currentModel]);


  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <ConversationHistoryPanel
        conversations={allConversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        className="w-64 md:w-72 flex-shrink-0" // Fixed width sidebar
      />

      <div className="flex flex-col flex-grow h-full"> {/* Main chat area */}
        <header className="p-3 border-b border-slate-700 bg-slate-800 shadow-sm sticky top-0 z-20 flex items-center justify-between">
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Home
            </Link>
            <div className="flex-grow max-w-xs"> {/* Constrain model selector width */}
                <ModelSelector
                    models={availableModels}
                    selectedModelId={selectedModelId}
                    onSelectModel={handleSelectModel}
                />
            </div>
             {/* Can add current conversation title here if desired */}
             {currentConversation && <span className="ml-4 text-sm text-slate-400 truncate hidden md:block">{currentConversation.title}</span>}
        </header>

        <ChatWindow messages={displayMessages} className="flex-grow" />

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isOverallLoading}
          className="sticky bottom-0 border-t border-slate-700" // Added border
        />
      </div>
    </div>
  );
}