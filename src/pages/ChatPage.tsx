// frontend/src/pages/ChatPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LlamaModel, Message, Conversation } from '../types/chat'; // Ensure these types are defined correctly
import { ModelSelector } from '../components/chat/ModelSelector';      // Your UI components
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatInput } from '../components/chat/ChatInput';
import { ConversationHistoryPanel } from '../components/chat/ConversationHistoryPanel';
import { Link } from 'react-router-dom';
import { loadConversations, saveConversations } from '../lib/localStorageUtils'; // Local storage helpers
// Import authStore if needed for tokens, or ensure apiClient handles it
// import { authStore } from '../stores'; // If directly accessing token from MobX

// Constants
const LLAMA_SERVER_URL_DEFAULT = 'https://timetable.rdu.edu.tr/test/ai/completion1'; // Your default LLaMA server
const CODENEST_GEMINI_PROXY_URL = 'https://timetable.rdu.edu.tr/codenest_v2/api/ai/chat/gemini/'; // Your CodeNest backend Gemini proxy

const MOCK_MODELS: LlamaModel[] = [
  { id: 'deepseek-coder-instruct', name: 'Deepseek Coder (Instruct)', url: LLAMA_SERVER_URL_DEFAULT },
  { id: 'llama2-7b', name: 'LLaMA 2 (7B)', url: 'https://timetable.rdu.edu.tr/test/ai/completion' }, // Another LLaMA endpoint
  { id: 'gamma-7b', name: 'Gamma (7B)', url: 'https://timetable.rdu.edu.tr/test/ai/completion' }, // Another LLaMA endpoint
  {
    id: 'hf-mistral-7b-instruct',
    name: 'Mistral 7B Instruct (HF)',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1'
  },
  {
    id: 'codenest-gemini-proxy', // Specific ID for your backend proxy
    name: 'CodeNest AI (Gemini)',  // User-friendly name
    url: CODENEST_GEMINI_PROXY_URL
  }
];

const DEFAULT_N_PREDICT = 512;        // For LLaMA models
const DEFAULT_TEMPERATURE = 0.7;      // For LLaMA models
const STOP_SEQUENCES = ["\n[Question]", "\nUser:", "\nSystem:", "[/INST]", "<|user|>", "<|assistant|>"]; // Stop sequences for LLaMA

// RAG related (kept for structure, but disabled for CodeNest Gemini proxy)
interface RagDocument {
  id: string;
  text: string;
  source?: string;
}

async function fetchRagContext(): Promise<RagDocument[]> {
  // console.log(`[RAG] Fetching context for query: "${query}" (currently disabled for some models)`);
  // For now, RAG is bypassed for the CodeNest Gemini proxy in handleSendMessage
  // You could enable it for other models if needed.
  return []; // Returning empty to effectively disable RAG globally for now
}

function formatLlamaPrompt(query: string, contextDocs: RagDocument[]): string {
  // This prompt formatting is specific to LLaMA-style instruction-following models.
  // Your CodeNest Gemini proxy handles its own internal prompting based on "message" and "history".
  let contextText = "No relevant context was found for this query.";
  if (contextDocs.length > 0) {
    contextText = "Relevant context:\n" + contextDocs.map(doc => `- ${doc.text}`).join("\n");
  }
  // Basic instruction format, adjust if your LLaMA models need specific [INST] tags etc.
  const prompt = `${contextText}\n\nQuestion: ${query}\n\nAnswer:`;
  // console.log("[PROMPT] Formatted LLaMA Prompt (if used):\n", prompt);
  return prompt;
}

export function ChatPage() {
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isOverallLoading, setIsOverallLoading] = useState(false);
  const [availableModels] = useState<LlamaModel[]>(MOCK_MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(MOCK_MODELS[0]?.id || '');

  useEffect(() => {
    const loadedConversations = loadConversations();
    setAllConversations(loadedConversations);
    if (loadedConversations.length > 0) {
      const mostRecentValidConvo = loadedConversations.find(c => availableModels.some(m => m.id === c.modelId)) || loadedConversations[0];
      if (mostRecentValidConvo) {
        setCurrentConversationId(mostRecentValidConvo.id);
        setSelectedModelId(mostRecentValidConvo.modelId);
      } else {
        handleNewChat(); // Start new if no valid model found in history
      }
    } else {
      handleNewChat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    // Avoid saving empty array on initial load if localStorage was empty
    if (allConversations.length > 0 || (localStorage.getItem('chatConversations') && JSON.parse(localStorage.getItem('chatConversations')!).length > 0) ) {
        saveConversations(allConversations);
    } else if (allConversations.length === 0 && localStorage.getItem('chatConversations')) {
        // If all conversations are deleted, clear localStorage too
        localStorage.removeItem('chatConversations');
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

  const updateMessageInConversation = useCallback((convoId: string, messageId: string, updates: Partial<Message>) => {
    setAllConversations(prevConvos =>
      prevConvos.map(convo =>
        convo.id === convoId
          ? {
            ...convo,
            messages: convo.messages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
            lastUpdatedAt: new Date(),
          }
          : convo
      )
    );
  }, []);

  const addMessageToConversation = useCallback((convoId: string, message: Message) => {
    setAllConversations(prevConvos =>
      prevConvos.map(convo =>
        convo.id === convoId
          ? {
            ...convo,
            messages: [...convo.messages, message],
            lastUpdatedAt: new Date(),
          }
          : convo
      ).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    );
  }, []);

  // const streamText = useCallback((conversationId: string, aiMessageId: string, fullText: string, onComplete?: () => void) => {
  //   let charIndex = 0;
  //   updateMessageInConversation(conversationId, aiMessageId, { text: '', isLoading: true, isError: false });

  //   const intervalId = setInterval(() => {
  //     if (charIndex < fullText.length) {
  //       updateMessageInConversation(conversationId, aiMessageId, { text: fullText.substring(0, charIndex + 1) });
  //       charIndex++;
  //     } else {
  //       clearInterval(intervalId);
  //       updateMessageInConversation(conversationId, aiMessageId, { isLoading: false });
  //       if (onComplete) onComplete();
  //     }
  //   }, SIMULATED_RESPONSE_DELAY_MS);
  //   return () => clearInterval(intervalId); // Cleanup function
  // }, [updateMessageInConversation]);

  const handleNewChat = useCallback(() => {
    setCurrentConversationId(null); // Signifies new chat UI state
    const codeNestModel = availableModels.find(m => m.id === 'codenest-gemini-proxy');
    setSelectedModelId(codeNestModel ? codeNestModel.id : (MOCK_MODELS[0]?.id || ''));
    // If using URL routing for chats, navigate here:
    // if (navigateUser) navigate("/chat");
  }, [availableModels]);

  const handleSelectConversation = useCallback((id: string) => {
    const selectedConvo = allConversations.find(c => c.id === id);
    if (selectedConvo) {
      setCurrentConversationId(id);
      setSelectedModelId(selectedConvo.modelId);
      // If using URL routing: navigate(`/chat/${id}`);
    }
  }, [allConversations]);

  const handleDeleteConversation = useCallback((id: string) => {
    const updatedConversations = allConversations.filter(c => c.id !== id);
    setAllConversations(updatedConversations);

    if (currentConversationId === id) {
      if (updatedConversations.length > 0) {
        // Select the most recently updated remaining conversation
        handleSelectConversation(updatedConversations.sort((a,b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0].id);
      } else {
        handleNewChat();
      }
    }
  }, [allConversations, currentConversationId, handleSelectConversation, handleNewChat]);

  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim() || !currentModel) return;
    setIsOverallLoading(true);

    let activeConversationId = currentConversationId;

    if (!activeConversationId) { // Create new conversation if none is active
      const newConvoId = uuidv4();
      const newConversation: Conversation = {
        id: newConvoId,
        title: inputText.substring(0, 30) + (inputText.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        modelId: selectedModelId,
      };
      setAllConversations(prev => [newConversation, ...prev].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()));
      setCurrentConversationId(newConvoId);
      activeConversationId = newConvoId;
    }

    const userMessage: Message = { id: uuidv4(), sender: 'user', text: inputText, timestamp: new Date() };
    addMessageToConversation(activeConversationId, userMessage);

    const aiMessageId = uuidv4();
    addMessageToConversation(activeConversationId, { id: aiMessageId, sender: 'ai', text: '', timestamp: new Date(), isLoading: true });

    try {
      const isCodeNestGeminiProxy = currentModel.id === 'codenest-gemini-proxy';
      const isHuggingFaceModel = currentModel.id.startsWith('hf-');

      let requestPayload: object;
      let responseText = '';

      // Get previous messages for history (excluding system messages and current user message)
      const conversationMessages = allConversations.find(c => c.id === activeConversationId)?.messages || [];
      const historyForBackend = conversationMessages
        .filter(msg => msg.id !== userMessage.id && msg.sender !== 'system' && !msg.isError)
        .slice(-10) // Max 10 previous messages (5 turns)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text,
        }));

      if (isCodeNestGeminiProxy) {
        requestPayload = {
          message: inputText,
          history: historyForBackend,
        };
        // RAG is explicitly disabled for this model by not calling fetchRagContext or using its output.
      } else {
        // Logic for other LLaMA or Hugging Face models
        const contextDocs = await fetchRagContext(); // RAG is currently returning [], effectively disabling it
        const promptForLlama = formatLlamaPrompt(inputText, contextDocs);

        if (isHuggingFaceModel) {
          requestPayload = {
            inputs: promptForLlama,
            parameters: { temperature: DEFAULT_TEMPERATURE, max_new_tokens: DEFAULT_N_PREDICT, return_full_text: false },
          };
        } else { // Other LLaMA-style models (e.g., llama.cpp server)
          requestPayload = {
            prompt: promptForLlama,
            n_predict: DEFAULT_N_PREDICT,
            temperature: DEFAULT_TEMPERATURE,
            stop: STOP_SEQUENCES,
            // stream: false, // Ensure stream is false if not handling streaming response
          };
        }
      }

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (isHuggingFaceModel) {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_HF_API_KEY}`;
      } else if (isCodeNestGeminiProxy) {
        const tokenDataString = localStorage.getItem('tokens'); // Assumes tokens are stored here
        if (tokenDataString) {
          try {
            const tokenData = JSON.parse(tokenDataString);
            if (tokenData && tokenData.access) {
              headers['Authorization'] = `Bearer ${tokenData.access}`;
            } else {
              console.warn("Access token not found in localStorage for CodeNest AI.");
            }
          } catch (e) {
            console.error("Error parsing tokens from localStorage", e);
          }
        } else {
          console.warn("No tokens found in localStorage for CodeNest AI. Request might fail if endpoint is protected.");
        }
      }


      const apiResponse = await fetch(currentModel.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload),
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text(); // Read body as text first
        let detail = errorBody;
        try {
            const jsonError = JSON.parse(errorBody); // Try to parse as JSON
            detail = jsonError.error || jsonError.detail || errorBody;
        } catch { /* Ignore if not JSON */ }
        throw new Error(`API server error: ${apiResponse.status} ${apiResponse.statusText}. Detail: ${detail}`);
      }

      const responseData = await apiResponse.json();

      if (isCodeNestGeminiProxy) {
        responseText = responseData?.reply?.trim() || '';
      } else if (isHuggingFaceModel) {
        responseText = Array.isArray(responseData) ? responseData[0]?.generated_text?.trim() || '' : responseData.generated_text?.trim() || '';
      } else { // Other LLaMA models
        responseText = responseData.content?.trim() || responseData.response?.trim() || responseData.text?.trim() || '';
         if (responseData.content === "" && responseData.stopped_eos) { // Handle llama.cpp empty content on stop
            responseText = "[EOS]";
         }
      }
      
      if (!responseText && responseText !== "[EOS]") { // Allow "[EOS]" as a valid (though empty) response
          console.warn("Model returned an empty or unparseable text response:", responseData);
          // Keep placeholder message or update with a specific "no response" message
          updateMessageInConversation(activeConversationId, aiMessageId, {
            text: "[No text response from model]",
            isLoading: false,
            isError: false, // Not necessarily an error, could be model's choice
          });
          setIsOverallLoading(false);
          return;
      }
      if (responseText === "[EOS]") responseText = ""; // Don't display [EOS]

      // const cleanupStream = streamText(activeConversationId, aiMessageId, responseText, () => {
      //   setIsOverallLoading();
      // });
      // Store cleanup function if needed, though streamText returns it for manual clearing if component unmounts

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

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    const currentActiveConversationId = currentConversationId; // Capture current value
    if (currentActiveConversationId) {
      setAllConversations(prevConvos =>
        prevConvos.map(c =>
          c.id === currentActiveConversationId ? { ...c, modelId: modelId, lastUpdatedAt: new Date() } : c
        ).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
      );
      addMessageToConversation(currentActiveConversationId, {
        id: uuidv4(),
        sender: 'system',
        text: `Switched to model: ${availableModels.find(m => m.id === modelId)?.name || 'Unknown'}`,
        timestamp: new Date()
      });
    }
    // If no current conversation, selectedModelId is updated and will be used for the next new chat.
  }, [currentConversationId, availableModels, addMessageToConversation]); // addMessageToConversation is stable via useCallback

  const displayMessages = useMemo(() => {
    if (!currentConversation && messages.length === 0 && !isOverallLoading) {
      return [{
        id: uuidv4(),
        sender: 'system',
        text: `Welcome! Select a model and start a new chat, or choose from history. Current: ${currentModel?.name || 'Default'}.`,
        timestamp: new Date()
      } as Message];
    }
    return messages;
  }, [messages, currentConversation, currentModel, isOverallLoading]);


  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <ConversationHistoryPanel
        conversations={allConversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={() => handleNewChat()} // Pass true if navigation is intended
        onDeleteConversation={handleDeleteConversation}
        className="w-64 md:w-72 lg:w-80 flex-shrink-0 border-r border-slate-700 bg-slate-850" // Added bg
      />

      <div className="flex flex-col flex-grow h-full overflow-hidden">
        <header className="p-3 border-b border-slate-700 bg-slate-800 shadow-sm sticky top-0 z-20 flex items-center justify-between flex-shrink-0">
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center mr-2 sm:mr-4 p-1 rounded hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back Home
          </Link>
          <div className="flex-grow max-w-xs sm:max-w-sm md:max-w-md">
            <ModelSelector
              models={availableModels}
              selectedModelId={selectedModelId}
              onSelectModel={handleSelectModel}
            />
          </div>
          {currentConversation && (
            <span className="ml-2 sm:ml-4 text-xs sm:text-sm text-slate-400 truncate hidden md:block flex-shrink-0 max-w-[200px]">
              {currentConversation.title}
            </span>
          )}
        </header>

        <ChatWindow messages={displayMessages} className="flex-grow overflow-y-auto" /> {/* Ensure this can scroll */}

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isOverallLoading}
          className="sticky bottom-0 border-t border-slate-700 bg-slate-800 flex-shrink-0 p-2 sm:p-3" // Added padding
        />
      </div>
    </div>
  );
}