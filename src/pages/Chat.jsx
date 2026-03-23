import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ModeToggle } from '@/components/ModeToggle';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ResolutionModal } from '@/components/ResolutionModal';
import { Input } from '@/components/ui/input';
import { ModeWrapper } from '@/components/ModeWrapper';
import { Loader2, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/errorMessages';

const Chat = () => {
  const {
    mode, setMode, currentMessages, sendMessage, fetchMessages,
    partnerName, addGoal, resolveVent, isLinked, coupleId,
    userName, userRole, user, addWsMessage,
  } = useApp();
  const resolvedRole = userRole || user?.role || '';
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [selectedTag, setSelectedTag] = useState('us');
  const [showResolution, setShowResolution] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [goalConfirmation, setGoalConfirmation] = useState('');
  const partnerTypingTimer = useRef(null);
  const goalConfirmationTimer = useRef(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const isVent = mode === 'vent';
  const isCalm = mode === 'calm';
  const wsEnabled = isCalm && isLinked && !!coupleId;

  const showGoalConfirmation = useCallback((message) => {
    if (goalConfirmationTimer.current) clearTimeout(goalConfirmationTimer.current);
    setGoalConfirmation(message);
    goalConfirmationTimer.current = setTimeout(() => setGoalConfirmation(''), 2500);
  }, []);

  const handleWsMessage = useCallback((msg) => {
    addWsMessage(msg);
    setPartnerTyping(false);
  }, [addWsMessage]);

  const handleWsTyping = useCallback(() => {
    setPartnerTyping(true);
    if (partnerTypingTimer.current) clearTimeout(partnerTypingTimer.current);
    partnerTypingTimer.current = setTimeout(() => setPartnerTyping(false), 3000);
  }, []);

  const { connected, send: wsSend, sendTyping } = useWebSocket({
    coupleId,
    enabled: wsEnabled,
    onMessage: handleWsMessage,
    onTyping: handleWsTyping,
  });

  // Fetch messages when mode changes
  useEffect(() => {
    fetchMessages(mode);
  }, [mode, fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => () => {
    if (partnerTypingTimer.current) clearTimeout(partnerTypingTimer.current);
    if (goalConfirmationTimer.current) clearTimeout(goalConfirmationTimer.current);
  }, []);

  // Send typing event in calm mode
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isCalm && connected) sendTyping();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');

    if (isCalm) {
      // WebSocket send for calm mode
      if (!isLinked) return;
      const sent = wsSend({
        text,
        sender_role: resolvedRole,
        sender_name: userName,
      });
      if (!sent) {
        toast.error('Not connected. Reconnecting...');
        setInput(text); // restore input
      }
    } else {
      // REST API for vent mode
      setSending(true);
      try {
        await sendMessage(text);
      } catch (e) {
        toast.error(friendlyError(e));
      } finally {
        setSending(false);
      }
    }
  };

  const handleGoalSubmit = async () => {
    if (!goalText.trim()) return;
    try {
      await addGoal(goalText, selectedTag);
      setGoalText('');
      setShowGoalInput(false);
      showGoalConfirmation('Goal added for your partner');
      toast.success('Goal added! 🎯');
    } catch (e) {
      setShowGoalInput(true);
      toast.error('Failed to add goal');
    }
  };

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    setPendingMode(newMode);
    setShowModeConfirm(true);
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      setMode(pendingMode);
      setInput('');
      setGoalText('');
      setShowGoalInput(false);
      if (pendingMode === 'vent') setShowBanner(true);
    }
    setShowModeConfirm(false);
    setPendingMode(null);
  };

  // Show "not linked" state for calm mode
  const showNotLinkedMessage = isCalm && !isLinked;

  return (
    <ModeWrapper>
      <div className="flex flex-col h-[100dvh] relative">
        {/* Top bar */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card z-[999] gap-2 sticky top-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground text-sm">
              ←
            </button>
            {isCalm && (
              <>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                  {(partnerName || 'P').charAt(0)}
                </div>
                <span className="text-xs font-body font-medium text-foreground truncate">{partnerName || 'Partner'}</span>
              </>
            )}
            
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
            <ModeToggle mode={mode} onModeChange={handleModeSwitch} />
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
                This is your safe space. Say what you feel. 
              </span>
              <button onClick={() => setShowBanner(false)} className="text-xs text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className={`flex-1 overflow-y-auto p-4 flex flex-col ${isVent ? 'angry-breathing' : ''}`}>
          <div className="flex-1" />
          {showNotLinkedMessage ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center px-6"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Link2Off className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground font-body mb-1">
                  Link with your partner to start calm chat
                </p>
                <p className="text-xs text-muted-foreground font-body mb-4">
                  Share your couple code or enter your partner's code from the dashboard.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/dashboard')}
                  className="rounded-pill bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                >
                  Go to Dashboard
                </motion.button>
              </motion.div>
            </div>
          ) : (
            <>
              {currentMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                 
                    <p className="text-sm text-muted-foreground font-body">
                      {isVent ? "Let it out. We're listening." : 'Start a conversation with your partner'}
                    </p>
                  </div>
                </div>
              )}
              {currentMessages.map((msg, i) => (
                <ChatBubble key={msg.id || i} message={msg} index={i} />
              ))}
              <AnimatePresence>
                {sending && <TypingIndicator label="Luna" />}
                {isCalm && partnerTyping && <TypingIndicator label={partnerName || 'Partner'} />}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Goal input (calm mode only) */}
        <AnimatePresence>
          {isCalm && !showNotLinkedMessage && showGoalInput && (
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
                {[['growth', '💪'], ['us', '❤️'], ['personal', '🌱']].map(([tag, emoji]) => (
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
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="What's a goal you'd like to share?"
                  className="rounded-[12px] text-sm flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleGoalSubmit()}
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

        <AnimatePresence>
          {goalConfirmation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-4 pb-2"
            >
              <div className="rounded-pill border border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-medium text-foreground">
                {goalConfirmation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        {!showNotLinkedMessage && (
          <div className="border-t border-border bg-card px-3 py-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {isCalm && (
              <button
                onClick={() => setShowGoalInput(!showGoalInput)}
                className="text-xs text-primary font-medium font-body mb-2 hover:underline"
              >
                {showGoalInput ? '− Hide goal setter' : '+ Set a Goal for Today'}
              </button>
            )}
            <div className="flex gap-2 items-center">
              <Input
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isVent ? "What's on your mind? Let it out..." : `Message ${partnerName || 'your partner'}...`}
                className="rounded-[12px] text-sm flex-1 min-w-0"
                disabled={sending || (isCalm && !connected)}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSend}
                disabled={sending || (isCalm && !connected)}
                className="rounded-pill bg-primary px-4 py-2 text-sm text-primary-foreground font-medium shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </motion.button>
            </div>
          </div>
        )}

        <ResolutionModal open={showResolution} onClose={() => setShowResolution(false)} />

        {/* Mode switch confirmation */}
        <AnimatePresence>
          {showModeConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
              onClick={() => setShowModeConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-xs rounded-lg bg-card p-6 shadow-warm text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  Switch to {pendingMode === 'vent' ? ' Vent' : ' Calm'} mode?
                </h3>
                <p className="text-xs text-muted-foreground font-body mb-6">
                  Your input will be cleared. Your chat history stays.
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowModeConfirm(false)}
                    className="flex-1 rounded-pill bg-muted py-2.5 text-xs font-medium text-muted-foreground"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={confirmModeSwitch}
                    className="flex-1 rounded-pill bg-primary py-2.5 text-xs font-medium text-primary-foreground"
                  >
                    Switch
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModeWrapper>
  );
};

export default Chat;
