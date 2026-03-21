import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, GoalTag } from '@/context/AppContext';
import { ModeToggle } from '@/components/ModeToggle';
import { ChatBubble } from '@/components/ChatBubble';
import { ResolutionModal } from '@/components/ResolutionModal';
import { Input } from '@/components/ui/input';
import { ModeWrapper } from '@/components/ModeWrapper';

const AI_CALM_RESPONSES = [
  "I hear you. That sounds like something important to talk about. 💛",
  "It's great that you're sharing this. Communication is the foundation of every strong relationship.",
  "That's a really thoughtful perspective. Have you shared this with your partner yet?",
  "I appreciate you opening up. Let's explore what's behind that feeling.",
  "That takes courage to say. You're both on the same team, remember that. 🌿",
];

const AI_VENT_RESPONSES = [
  "I hear you, and your feelings are completely valid. Take your time. 🫂",
  "It's okay to feel this way. There's no judgment here — just space for you.",
  "Sometimes we need to let it all out before we can think clearly. I'm here.",
  "Your frustration makes sense. You deserve to be heard.",
  "Let it out. This is your safe space. There's no rush to fix anything right now. 💜",
];

const Chat = () => {
  const { mode, setMode, messages, addMessage, partnerName, userName, addGoal } = useApp();
  const [input, setInput] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [selectedTag, setSelectedTag] = useState<GoalTag>('us');
  const [showResolution, setShowResolution] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<'calm' | 'vent' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage({ text: input, sender: 'user' });
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const pool = mode === 'vent' ? AI_VENT_RESPONSES : AI_CALM_RESPONSES;
      addMessage({ text: pool[Math.floor(Math.random() * pool.length)], sender: 'ai' });
    }, 800);
  };

  const handleGoalSubmit = () => {
    if (!goalText.trim()) return;
    addGoal(goalText, selectedTag);
    setGoalText('');
    setShowGoalInput(false);
  };

  const isVent = mode === 'vent';

  return (
    <ModeWrapper>
      <div className="flex flex-col h-screen">
        {/* Top bar */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm z-10 gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground text-sm">
              ←
            </button>
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
              {(partnerName || 'P').charAt(0)}
            </div>
            <span className="text-xs font-body font-medium text-foreground truncate">{partnerName || 'Partner'}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isVent && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowResolution(true)}
                className="text-[10px] rounded-pill px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 font-body whitespace-nowrap"
              >
                Feeling better?
              </motion.button>
            )}
            <ModeToggle />
          </div>
        </header>

        {/* Vent banner */}
        <AnimatePresence>
          {isVent && showBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center justify-between"
            >
              <span className="text-xs font-body text-foreground">
                This is your safe space. Say what you feel. 🫂
              </span>
              <button onClick={() => setShowBanner(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className={`flex-1 overflow-y-auto p-4 ${isVent ? 'angry-breathing' : ''}`}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-4xl block mb-3">{isVent ? '🫂' : '💬'}</span>
                <p className="text-sm text-muted-foreground font-body">
                  {isVent ? "Let it out. We're listening." : `Start a conversation with your AI companion`}
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={msg.id} message={msg} index={i} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Goal input (calm mode only) */}
        <AnimatePresence>
          {!isVent && showGoalInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-card px-4 py-3"
            >
              <p className="text-xs font-medium text-foreground font-body mb-2">
                Set a goal for {partnerName || 'Partner'} to see
              </p>
              <div className="flex gap-2 mb-2">
                {([['growth', '💪'], ['us', '❤️'], ['personal', '🌱']] as const).map(([tag, emoji]) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-pill px-3 py-1 text-xs font-body border transition-colors ${
                      selectedTag === tag ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {emoji} {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={goalText}
                  onChange={e => setGoalText(e.target.value)}
                  placeholder="What's a goal you'd like to share?"
                  className="rounded-[12px] text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleGoalSubmit()}
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGoalSubmit}
                  className="rounded-pill bg-primary px-4 text-sm text-primary-foreground font-medium"
                >
                  Share
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="border-t border-border bg-card px-4 py-3">
          {!isVent && (
            <button
              onClick={() => setShowGoalInput(!showGoalInput)}
              className="text-xs text-primary font-medium font-body mb-2 hover:underline"
            >
              {showGoalInput ? '− Hide goal setter' : '+ Set a Goal for Today'}
            </button>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isVent ? "What's on your mind? Let it out..." : `Message ${partnerName || 'your companion'}...`}
              className="rounded-[12px] text-sm flex-1"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSend}
              className="rounded-pill bg-primary px-5 text-sm text-primary-foreground font-medium shadow-soft hover:bg-primary/90 transition-colors"
            >
              Send
            </motion.button>
          </div>
        </div>

        <ResolutionModal open={showResolution} onClose={() => setShowResolution(false)} />
      </div>
    </ModeWrapper>
  );
};

export default Chat;
