import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ModeToggle } from '@/components/ModeToggle';
import { ChatBubble } from '@/components/ChatBubble';
import { VoiceBubble } from '@/components/VoiceBubble';
import { DateSeparator, toISTDateKey, formatDateLabel } from '@/components/DateSeparator';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ResolutionModal } from '@/components/ResolutionModal';
import { Input } from '@/components/ui/input';
import { ModeWrapper } from '@/components/ModeWrapper';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Loader2, Link2Off, ArrowLeft, Mic, MicOff, X, Send, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/errorMessages';
import api from '@/api';

const VENT_BANNER_SEEN_KEY = 'solace_vent_banner_seen';

const shouldShowVentBanner = () => {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(VENT_BANNER_SEEN_KEY)) return false;
    sessionStorage.setItem(VENT_BANNER_SEEN_KEY, 'true');
    return true;
  } catch {
    return true;
  }
};

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
  const [showBanner, setShowBanner] = useState(() => (mode === 'vent' ? shouldShowVentBanner() : false));
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [goalConfirmation, setGoalConfirmation] = useState('');
  const [sendingVoice, setSendingVoice] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef(null);
  const previewAnimRef = useRef(null);

  const { recording, audioBlob, duration, startRecording, stopRecording, cancelRecording, setAudioBlob } = useVoiceRecorder();

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Create / revoke blob URL for preview — must be STATE so re-render gives audio element the src
  const [previewSrc, setPreviewSrc] = useState(null);
  const prevPreviewSrc = useRef(null);  // track for cleanup only
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      prevPreviewSrc.current = url;
      setPreviewSrc(url);
      setPreviewProgress(0);
      setPreviewCurrentTime(0);
      setPreviewPlaying(false);
    } else {
      if (prevPreviewSrc.current) {
        URL.revokeObjectURL(prevPreviewSrc.current);
        prevPreviewSrc.current = null;
      }
      setPreviewSrc(null);
      setPreviewPlaying(false);
      setPreviewProgress(0);
      setPreviewCurrentTime(0);
      cancelAnimationFrame(previewAnimRef.current);
    }
  }, [audioBlob]);

  const tickPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    const pct = audio.duration ? audio.currentTime / audio.duration : 0;
    setPreviewProgress(pct);
    setPreviewCurrentTime(audio.currentTime);
    if (!audio.paused) {
      previewAnimRef.current = requestAnimationFrame(tickPreview);
    }
  }, []);

  const togglePreviewPlay = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) {
      audio.pause();
      cancelAnimationFrame(previewAnimRef.current);
      setPreviewPlaying(false);
    } else {
      audio.play();
      setPreviewPlaying(true);
      previewAnimRef.current = requestAnimationFrame(tickPreview);
    }
  }, [previewPlaying, tickPreview]);

  const handleSendVoice = useCallback(async () => {
    if (!audioBlob) return;
    setSendingVoice(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('duration', String(duration));
      formData.append('mode', mode);
      const { data: voiceMsg } = await api.post('/messages/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // addWsMessage normalizes and adds message to state
      addWsMessage({ ...voiceMsg, isMine: true });
      setAudioBlob(null);
    } catch (e) {
      toast.error('Failed to send voice message');
    } finally {
      setSendingVoice(false);
    }
  }, [audioBlob, duration, mode, addWsMessage, setAudioBlob]);

  // ✅ 1. seenMessageIds state first
  const [seenMessageIds, setSeenMessageIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`seen_${coupleId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

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

  // ✅ 2. updateSeenIds before handleWsMessage
  const updateSeenIds = useCallback((newIds) => {
    setSeenMessageIds(prev => {
      const updated = new Set(prev);
      newIds.forEach(id => updated.add(id));
      try {
        localStorage.setItem(`seen_${coupleId}`, JSON.stringify([...updated]));
      } catch { }
      return updated;
    });
  }, [coupleId]);

  // ✅ 3. handleWsMessage after updateSeenIds
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'seen') {
      updateSeenIds(msg.message_ids);
      return;
    }
    addWsMessage(msg);
    setPartnerTyping(false);
  }, [addWsMessage, updateSeenIds]);

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

  useEffect(() => {
    fetchMessages(mode);
  }, [mode, fetchMessages]);

  // Sync seen from DB (messages with seen: true)
  useEffect(() => {
    if (!coupleId) return;
    const alreadySeenIds = currentMessages
      .filter(m => m.seen === true)
      .map(m => m.id)
      .filter(Boolean);
    if (alreadySeenIds.length > 0) updateSeenIds(alreadySeenIds);
  }, [currentMessages, updateSeenIds]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Send seen acknowledgement when partner messages arrive
  useEffect(() => {
    // Only mark messages as seen when the user actually has the chat open
    // and the tab/window is visible and focused. Do NOT mark seen from
    // background/onMessage handlers.
    if (!connected || !isCalm) return;
    try {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
    } catch (e) {
      // conservative: if any error, avoid marking seen
      return;
    }

    const unseenPartnerMsgIds = currentMessages
      .filter(m => !m.isMine && !seenMessageIds.has(m.id))
      .map(m => m.id)
      .filter(Boolean);
    if (unseenPartnerMsgIds.length > 0) {
      wsSend({ type: 'seen', message_ids: unseenPartnerMsgIds });
      updateSeenIds(unseenPartnerMsgIds);
    }
  }, [currentMessages, connected, isCalm, updateSeenIds]);

  useEffect(() => () => {
    if (partnerTypingTimer.current) clearTimeout(partnerTypingTimer.current);
    if (goalConfirmationTimer.current) clearTimeout(goalConfirmationTimer.current);
  }, []);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isCalm && connected) sendTyping();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');

    if (isCalm) {
      if (!isLinked) return;
      const sent = wsSend({
        text,
        sender_role: resolvedRole,
        sender_name: userName,
      });
      if (!sent) {
        toast.error('Not connected. Reconnecting...');
        setInput(text);
      }
    } else {
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
      if (pendingMode === 'vent') setShowBanner(shouldShowVentBanner());
    }
    setShowModeConfirm(false);
    setPendingMode(null);
  };
  // In Chat.jsx — send voice message
  const sendVoiceMessage = async (blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    formData.append('couple_id', coupleId);

    const { data } = await api.post('/messages/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Notify partner via WebSocket
    wsSend({
      type: 'voice_message',
      message_id: data.id,
      audio_url: data.audio_url,
      duration: data.duration,
      sender_id: user.id,
      sender_name: userName,
      timestamp: data.timestamp,
    });
  };

  const showNotLinkedMessage = isCalm && !isLinked;

  return (
    <ModeWrapper>
      <div className="h-[100dvh] bg-background flex flex-col relative">

        {/* Header */}
        <header className="sticky top-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card z-[999] gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:opacity-70 -ml-1"
            >
              <ArrowLeft size={22} strokeWidth={1.8} />
            </button>
            {isCalm && (
              <>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                  {(partnerName || 'P').charAt(0)}
                </div>
                <span className="text-xs font-body font-medium text-foreground truncate">
                  {partnerName || 'Partner'}
                </span>
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



        <div
          data-pull-scroll
          className={`flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-1.5 flex flex-col ${isVent ? 'angry-breathing' : ''}`}
        >
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
              {currentMessages.map((msg, i) => {
                const ts = msg.timestamp;
                const dateKey = ts ? toISTDateKey(ts) : null;
                const prevTs  = i > 0 ? currentMessages[i - 1].timestamp : null;
                const prevKey = prevTs ? toISTDateKey(prevTs) : null;
                const showSep = dateKey && dateKey !== prevKey;

                const bubble = msg.type === 'voice' || msg.audio_url ? (
                  <VoiceBubble
                    key={msg.id || i}
                    message={msg}
                    isMine={msg.isMine}
                    seen={seenMessageIds.has(msg.id)}
                    isCalm={isCalm}
                  />
                ) : (
                  <ChatBubble
                    key={msg.id || i}
                    message={msg}
                    index={i}
                    seen={seenMessageIds.has(msg.id)}
                  />
                );

                return (
                  <div key={`grp-${msg.id || i}`}>
                    {showSep && (
                      <DateSeparator label={formatDateLabel(dateKey)} />
                    )}
                    {bubble}
                  </div>
                );
              })}
              <AnimatePresence>
                {sending && <TypingIndicator label="Luna" />}
                {isCalm && partnerTyping && <TypingIndicator label={partnerName || 'Partner'} />}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Goal input */}
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
                    className={`rounded-pill px-3 py-1 text-xs font-body border transition-colors ${selectedTag === tag
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground'
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

        {!showNotLinkedMessage && (
          <div
            className="border-t border-border bg-card px-3 pt-[6.5px] shrink-0"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            {isCalm && (
              <button
                onClick={() => setShowGoalInput(!showGoalInput)}
                className="text-xs text-primary font-medium font-body mb-2 hover:underline"
              >
                {showGoalInput ? '− Hide goal setter' : '+ Set a Goal for Today'}
              </button>
            )}
            {/* Voice recording preview bar */}
            <AnimatePresence>
              {audioBlob && !recording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mb-2 bg-primary/10 rounded-xl px-3 py-2"
                >
                  {/* hidden audio element for preview playback */}
                  <audio
                    ref={previewAudioRef}
                    src={previewSrc}
                    onEnded={() => {
                      setPreviewPlaying(false);
                      setPreviewProgress(0);
                      setPreviewCurrentTime(0);
                      cancelAnimationFrame(previewAnimRef.current);
                    }}
                  />

                  {/* Play / Pause preview */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePreviewPlay}
                    className="shrink-0 w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors"
                  >
                    {previewPlaying
                      ? <Pause size={14} className="fill-current" />
                      : <Play size={14} className="ml-0.5 fill-current" />}
                  </motion.button>

                  {/* Live waveform with progress */}
                  <div className="flex items-center gap-[2px] flex-1 h-6">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const active = (i / 28) <= previewProgress;
                      return (
                        <div
                          key={i}
                          className="rounded-full transition-colors duration-75"
                          style={{
                            width: 2.5,
                            height: `${30 + (i * 7) % 60}%`,
                            backgroundColor: active ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 30%, transparent)',
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* time / total */}
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                    {previewPlaying ? fmtDuration(previewCurrentTime) : fmtDuration(duration)}
                  </span>

                  {/* Discard */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { cancelRecording(); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={15} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendVoice}
                    disabled={sendingVoice}
                    className="rounded-full bg-primary p-1.5 text-primary-foreground disabled:opacity-50"
                  >
                    {sendingVoice ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 items-center">
              {/* Mic button — calm mode only */}
              {isCalm && !recording && !audioBlob && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={startRecording}
                  disabled={sending || !connected}
                  className="rounded-full p-2 shrink-0 transition-colors bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-40"
                  title="Tap to record"
                >
                  <Mic size={18} />
                </motion.button>
              )}

              {/* Recording UI — calm mode only */}
              {isCalm && recording && (
                <>
                  {/* Cancel — discard without stopping */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={cancelRecording}
                    className="rounded-full p-2 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Cancel recording"
                  >
                    <X size={18} />
                  </motion.button>

                  {/* Live timer */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {fmtDuration(duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">Recording…</span>
                  </div>

                  {/* STOP — stops and shows preview */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={stopRecording}
                    className="rounded-full w-9 h-9 shrink-0 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md"
                    title="Stop recording"
                  >
                    {/* filled square = stop icon */}
                    <span className="w-3.5 h-3.5 rounded-sm bg-white block" />
                  </motion.button>
                </>
              )}


              {!recording && (
                <>
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={
                      isVent
                        ? "What's on your mind? Let it out..."
                        : `Message ${partnerName || 'your partner'}...`
                    }
                    className="rounded-[12px] text-sm flex-1 min-w-0"
                    disabled={sending || (isCalm && !connected) || !!audioBlob}
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSend}
                    disabled={sending || (isCalm && !connected) || !!audioBlob}
                    className="rounded-pill bg-primary px-4 py-2 text-sm text-primary-foreground font-medium shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        )}

        <ResolutionModal open={showResolution} onClose={() => setShowResolution(false)} />

        {/* Mode switch confirmation modal */}
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
