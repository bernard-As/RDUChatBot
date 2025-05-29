// src/pages/LandingPage.tsx
import { useNavigate } from 'react-router-dom';
// Ensure this path correctly points to the BackgroundGradientAnimation component file
// and that the file exports a component named BackgroundGradientAnimation
import { BackgroundGradient } from '../components/ui/background-gradient-animation';
import { TextRevealCard, TextRevealCardDescription, TextRevealCardTitle } from '../components/ui/text-reveal-card';

export function LandingPage() {
  const navigate = useNavigate();

  const handleStartChatting = () => {
    navigate('/chat');
  };

  return (
    // This div should try to take full viewport height and width
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900"> {/* Added default bg as fallback */}
      {/* Background Animation Layer */}
      <BackgroundGradient
        animate
        className="absolute inset-0 z-0" // Applies to the component's root div
      />

      {/* Content Layer */}
      {/* This div also tries to take full viewport height for centering content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="max-w-3xl mx-auto">
          <TextRevealCard
            text="Intelligent Conversations"
            revealText="Powered by LLaMA & RAG"
            className="mb-8" // Removed shadow-2xl as it might be too heavy on a dark bg
          >
            <TextRevealCardTitle className="text-white"> {/* Ensure contrast */}
              Meet Your Advanced AI Assistant
            </TextRevealCardTitle>
            <TextRevealCardDescription className="text-slate-300">
              Leveraging cutting-edge Retrieval-Augmented Generation and Large Language Models
              for insightful, context-aware interactions.
            </TextRevealCardDescription>
          </TextRevealCard>

          <p className="text-slate-200 text-lg md:text-xl mb-12">
            Ask complex questions, get detailed explanations, and explore information like never before.
            Our system combines vast knowledge with real-time understanding to provide you with accurate and relevant responses.
          </p>

          {/* Your custom button - this looks fine! */}
          <button
            onClick={handleStartChatting}
            className="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full p-[1.5px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-800 group"
          >
            <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:opacity-100 opacity-75 transition-opacity duration-500" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-base font-medium text-white backdrop-blur-3xl gap-2">
              <span>Start Chatting</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
            </span>
          </button>
        </div>

        <footer className="absolute bottom-8 text-slate-400 text-sm">
          © {new Date().getFullYear()} Serverless Chat Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}