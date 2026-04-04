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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ModeWrapper } from '@/components/ModeWrapper';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Loader2, Link2Off, ArrowLeft, Mic, X, Send, Play, Pause, Search } from 'lucide-react';
import Lightbox from '@/components/Lightbox';
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
    userName, userRole, user, addWsMessage, removeMessageByTempId, loadOlderMessages,
    deleteMessage, searchMessages, fetchMessageContext,
  } = useApp();

  // pull partner avatar from context (kept in AppContext)
  const { partnerProfilePic } = useApp();

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
  const [replyingTo, setReplyingTo] = useState(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [focusedMessages, setFocusedMessages] = useState(null);
  const [focusedTargetId, setFocusedTargetId] = useState(null);
  const previewAudioRef = useRef(null);
  const previewAnimRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const currentMessagesRef = useRef([]);
  const messageRefs = useRef({});
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [showPartnerLightbox, setShowPartnerLightbox] = useState(false);
  const inputRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    // On notification cold start the viewport height isn't settled yet.
    // A short delay lets the browser finalize chrome/safe-area before first paint.
    const t = setTimeout(() => {
      try {
        document.documentElement.style.setProperty('--real-vh', window.innerHeight + 'px');
      } catch (e) {}
      setLayoutReady(true);
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const { recording, audioBlob, duration, startRecording, stopRecording, cancelRecording, setAudioBlob } = useVoiceRecorder();

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;


  useEffect(() => {
    currentMessagesRef.current = currentMessages;
  }, [currentMessages]);
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

    // Show voice message instantly with a local blob URL while upload is in-flight.
    const localUrl = URL.createObjectURL(audioBlob);
    const tempId = `tmp_voice_${Date.now()}`;
    addWsMessage({
      id: tempId,
      local_key: tempId,
      client_temp_id: tempId,
      type: 'voice',
      audio_url: localUrl,
      duration,
      sender: 'user',
      sender_name: userName,
      sender_role: resolvedRole,
      sender_id: user?.id || '',
      timestamp: new Date().toISOString(),
      isMine: true,
      pending: true,
    });
    setAudioBlob(null);

    try {
      const voiceExt = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `voice.${voiceExt}`);
      formData.append('duration', String(duration));
      formData.append('mode', mode);
      const { data: voiceMsg } = await api.post('/messages/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      removeMessageByTempId(tempId);
      addWsMessage({ ...voiceMsg, isMine: true });
    } catch (e) {
      removeMessageByTempId(tempId);
      toast.error('Failed to send voice message');
    } finally {
      setSendingVoice(false);
    }
  }, [audioBlob, duration, mode, addWsMessage, removeMessageByTempId, setAudioBlob, userName, resolvedRole, user]);

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
  const chatScrollRef = useRef(null);
  const isPositioningRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const hasMoreRef = useRef(true);
  const suppressAutoScrollRef = useRef(false);
  const shouldRestoreScrollRef = useRef(null);
  const scrollDebounceRef = useRef(null);  // Debounce timer for scroll events
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure hardware back (popstate) navigates to dashboard instead of closing the PWA
    try {
      window.history.pushState(null, '', window.location.href);
    } catch (e) {}

    const handlePopState = () => {
      try { window.history.pushState(null, '', window.location.href); } catch (e) {}
      navigate('/dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  const isVent = mode === 'vent';
  const isCalm = mode === 'calm';
  const wsEnabled = isCalm && isLinked && !!coupleId;
  const isFocusedView = Array.isArray(focusedMessages);

  const isWithinDeleteWindow = useCallback((message) => {
    if (!message?.timestamp) return false;
    const ts = Date.parse(message.timestamp);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= 24 * 60 * 60 * 1000;
  }, []);

  const registerMessageRef = useCallback((id, node) => {
    if (!id) return;
    if (node) messageRefs.current[id] = node;
    else delete messageRefs.current[id];
  }, []);

  const applyTemporaryHighlight = useCallback((messageId) => {
    if (!messageId) return;
    setHighlightedMessageId(String(messageId));
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedMessageId(null), 2500);
  }, []);

  const openFocusedThread = useCallback(async (messageId) => {
    if (!isCalm || !messageId) return;
    try {
      const data = await fetchMessageContext({ messageId, mode, window: 6 });
      if (!data?.messages?.length) {
        toast.info('Could not load message context');
        return;
      }
      setFocusedMessages(data.messages);
      setFocusedTargetId(String(data.targetId || messageId));
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }, [fetchMessageContext, isCalm, mode]);

  const backToLatestMessages = useCallback(() => {
    setFocusedMessages(null);
    setFocusedTargetId(null);
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  const jumpToMessage = useCallback(async (messageId) => {
    if (!messageId) return;
    const targetId = String(messageId);

    const scrollToKnownNode = () => {
      const node = messageRefs.current[targetId];
      if (!node) return false;
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      applyTemporaryHighlight(targetId);
      return true;
    };

    if (scrollToKnownNode()) return;

    if (!hasMoreRef.current || loadingOlderRef.current) {
      toast.info('Original message is not available in loaded history');
      return;
    }

    let loops = 0;
    while (loops < 12 && hasMoreRef.current) {
      loops += 1;
      const oldestMessage = currentMessagesRef.current[0];
      const before = oldestMessage?.timestamp || null;
      if (!before) break;

      loadingOlderRef.current = true;
      setLoadingOlder(true);
      try {
        const meta = await loadOlderMessages(mode, before);
        hasMoreRef.current = Boolean(meta?.hasMore);
      } finally {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (scrollToKnownNode()) return;
    }

    toast.info('Original message could not be found in available history');
  }, [applyTemporaryHighlight, loadOlderMessages, mode]);

  useEffect(() => {
    if (!isFocusedView || !focusedTargetId) return;
    requestAnimationFrame(() => {
      const node = messageRefs.current[String(focusedTargetId)];
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      applyTemporaryHighlight(String(focusedTargetId));
    });
  }, [focusedMessages, focusedTargetId, isFocusedView, applyTemporaryHighlight]);

  const handleDeleteMessage = useCallback(async (message) => {
    if (!message?.id || !message?.isMine || message?.is_deleted || !isWithinDeleteWindow(message)) return;
    setDeleteTarget(message);
  }, [isWithinDeleteWindow]);

  const confirmDeleteMessage = useCallback(async () => {
    if (!deleteTarget?.id) return;
    try {
      // Preserve user's current scroll position so deleting a message
      // doesn't yank them back to the latest messages.
      const el = chatScrollRef.current;
      if (el) {
        shouldRestoreScrollRef.current = {
          previousScrollHeight: el.scrollHeight,
          previousScrollTop: el.scrollTop,
        };
        suppressAutoScrollRef.current = true;
      }
      await deleteMessage(deleteTarget.id);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteMessage, deleteTarget]);

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
    let active = true;
    setScrollReady(false);
    isPositioningRef.current = true;

    fetchMessages(mode).then((meta) => {
      if (!active) return;
      hasMoreRef.current = Boolean(meta?.hasMore);
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        requestAnimationFrame(() => {
          if (!active) return;
          isPositioningRef.current = false;
          setScrollReady(true);
        });
      });
    });

    return () => {
      active = false;
    };
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
    if (isPositioningRef.current) return;
    if (suppressAutoScrollRef.current) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [currentMessages]);

  useEffect(() => {
    const pending = shouldRestoreScrollRef.current;
    if (!pending) return;
    requestAnimationFrame(() => {
      const now = chatScrollRef.current;
      if (!now) return;
      const delta = now.scrollHeight - pending.previousScrollHeight;
      now.scrollTop = pending.previousScrollTop + delta;
      shouldRestoreScrollRef.current = null;
      suppressAutoScrollRef.current = false;
    });
  }, [currentMessages]);

  const handleScroll = useCallback(() => {
    if (isFocusedView) return;
    const el = chatScrollRef.current;
    if (!el) return;
    // Prefetch before user reaches the very top for smoother infinite scroll.
    if (el.scrollTop > 200) return;

    // Debounce scroll events to avoid rapid API calls (150ms)
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      if (loadingOlderRef.current) return;
      if (!hasMoreRef.current) return;
      const oldestMessage = currentMessages[0];
      const before = oldestMessage?.timestamp || null;
      if (!before) return;

      loadingOlderRef.current = true;
      setLoadingOlder(true);
      suppressAutoScrollRef.current = true;
      const previousScrollHeight = el.scrollHeight;
      const previousScrollTop = el.scrollTop;

      loadOlderMessages(mode, before)
        .then((meta) => {
          hasMoreRef.current = Boolean(meta?.hasMore);
          if (!meta?.loaded) return;
          shouldRestoreScrollRef.current = { previousScrollHeight, previousScrollTop };
        })
        .finally(() => {
          loadingOlderRef.current = false;
          setLoadingOlder(false);
          if (!shouldRestoreScrollRef.current) {
            suppressAutoScrollRef.current = false;
          }
        });
    }, 150);
  }, [currentMessages, loadOlderMessages, mode, isFocusedView]);

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
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  useEffect(() => {
    if (!showSearch) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchMessages({ query: q, mode, chatId: coupleId, limit: 30 });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery, showSearch, searchMessages, mode, coupleId]);

  useEffect(() => {
    if (!showSearch) return;

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    const handleOutsidePointer = (event) => {
      const target = event.target;
      if (!target) return;

      if (target.closest('[data-search-toggle]')) return;
      if (searchContainerRef.current?.contains(target)) return;

      setShowSearch(false);
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [showSearch]);

  useEffect(() => {
    if (isCalm) return;
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setReplyingTo(null);
    setFocusedMessages(null);
    setFocusedTargetId(null);
  }, [isCalm]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isCalm && connected) sendTyping();
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    const replyPayload = replyingTo
      ? {
          id: replyingTo.id,
          messageId: replyingTo.id,
          text: replyingTo.text,
          sender_name: replyingTo.sender_name,
        }
      : null;
    setInput('');

    if (isCalm) {
      if (!isLinked) return;
      const clientTempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      addWsMessage({
        id: clientTempId,
        local_key: clientTempId,
        client_temp_id: clientTempId,
        text,
        sender: 'user',
        sender_role: resolvedRole,
        sender_id: user?.id || '',
        sender_name: userName,
        timestamp: new Date().toISOString(),
        reply_to: replyPayload,
        isMine: true,
        pending: true,
      });

      const sent = wsSend({
        text,
        client_temp_id: clientTempId,
        reply_to: replyPayload,
        sender_role: resolvedRole,
        sender_name: userName,
      });
      if (!sent) {
        removeMessageByTempId(clientTempId);
        toast.error('Not connected. Reconnecting...');
        setInput(text);
      } else {
        setReplyingTo(null);
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

    // Keep mobile keyboard open by refocusing the input after React updates
    // and auto-scroll to latest message so the input and latest message remain visible.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    });
    setTimeout(() => inputRef.current?.focus(), 50);
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
      setReplyingTo(null);
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
  const visibleMessages = isFocusedView ? focusedMessages : currentMessages;

  return (
    <ModeWrapper>
      <div
        className="bg-background flex flex-col relative"
        style={{
          height: 'var(--real-vh, 100dvh)',
          visibility: layoutReady ? 'visible' : 'hidden',
        }}
      >

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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { if (partnerProfilePic) setShowPartnerLightbox(true); }}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && partnerProfilePic) setShowPartnerLightbox(true); }}
                  className={`h-6 w-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${partnerProfilePic ? 'cursor-pointer' : ''}`}
                  aria-label={partnerProfilePic ? 'View partner photo' : 'Partner avatar'}
                >
                  {partnerProfilePic ? (
                    <img src={partnerProfilePic} alt={partnerName || 'Partner'} className="h-full w-full object-cover object-center block" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary">
                      {(partnerName || 'P').charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-body font-medium text-foreground truncate">
                  {partnerName || 'Partner'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isCalm && (
              <button
                type="button"
                data-search-toggle
                onClick={() => {
                  setShowSearch((v) => !v);
                  if (showSearch) {
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
                className="text-foreground min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer active:opacity-70"
                aria-label="Search messages"
              >
                <Search size={18} />
              </button>
            )}
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

        {isCalm && showSearch && (
          <div ref={searchContainerRef} className="bg-card px-3 py-1">
            <div className="relative">
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this chat"
                className="h-8 text-sm rounded-lg pr-8 border-0 focus:ring-0 focus:border-0 bg-card"
              />
              {searching && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {searchQuery.trim() && (
              <div className="mt-1 max-h-32 overflow-y-auto rounded-lg bg-background/60">
                {searchResults.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No results</p>
                ) : (
                  searchResults.map((msg) => (
                    <button
                      key={`sr-${msg.id}`}
                      type="button"
                      className="block w-full border-b border-border/40 px-2 py-1 text-left last:border-b-0 hover:bg-muted/40"
                      onClick={() => openFocusedThread(msg.id)}
                    >
                      <p className="line-clamp-1 text-sm text-foreground">{msg.text}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {isCalm && isFocusedView && (
          <div className="border-b border-border bg-card px-3 py-2">
            <button
              type="button"
              onClick={backToLatestMessages}
              className="text-xs font-medium text-primary hover:underline"
            >
              Back to latest messages
            </button>
          </div>
        )}



        <div
          data-pull-scroll
          ref={chatScrollRef}
          onScroll={handleScroll}
          className={`flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-1.5 flex flex-col ${isVent ? 'angry-breathing' : ''} ${scrollReady ? 'opacity-100' : 'opacity-0'}`}
        >
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
              {loadingOlder && hasMoreRef.current && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {visibleMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-body">
                      {isVent ? "Let it out. We're listening." : 'Start a conversation with your partner'}
                    </p>
                  </div>
                </div>
              )}
              {visibleMessages.map((msg, i) => {
                const itemKey = msg.local_key || msg.id || i;
                const ts = msg.timestamp;
                const dateKey = ts ? toISTDateKey(ts) : null;
                const prevTs  = i > 0 ? visibleMessages[i - 1].timestamp : null;
                const prevKey = prevTs ? toISTDateKey(prevTs) : null;
                const showSep = dateKey && dateKey !== prevKey;

                const bubble = msg.type === 'voice' || msg.audio_url ? (
                  <VoiceBubble
                    key={itemKey}
                    message={msg}
                    isMine={msg.isMine}
                    seen={seenMessageIds.has(msg.id)}
                    isCalm={isCalm}
                  />
                ) : (
                  <ChatBubble
                    key={itemKey}
                    message={msg}
                    index={i}
                    seen={seenMessageIds.has(msg.id)}
                    highlighted={String(highlightedMessageId || '') === String(msg.id || '')}
                    onReply={isCalm ? (m) => {
                      if (isFocusedView) return;
                      if (m?.is_deleted) return;
                      const previewText = String(m?.text || '').trim();
                      if (!previewText) return;
                      setReplyingTo({
                        id: String(m?.id || ''),
                        text: previewText,
                        sender_name: m?.isMine ? 'You' : (partnerName || 'Partner'),
                      });
                    } : undefined}
                    onReplyPreviewClick={isCalm ? (id) => (isFocusedView ? undefined : jumpToMessage(id)) : undefined}
                    onLongPressDelete={isCalm ? (m) => (isFocusedView ? undefined : handleDeleteMessage(m)) : undefined}
                    canDelete={Boolean(!isFocusedView && isCalm && msg?.isMine && !msg?.is_deleted && isWithinDeleteWindow(msg))}
                  />
                );

                return (
                  <div key={`grp-${itemKey}`} ref={(node) => registerMessageRef(String(msg.id || itemKey), node)}>
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
                <Textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="What's a goal you'd like to share?"
                  rows={3}
                  className="rounded-[12px] text-sm flex-1 min-h-[84px] resize-none"
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleGoalSubmit();
                    }
                  }}
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
            {isCalm && replyingTo && (
              <div className="mb-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-primary">Replying to {replyingTo.sender_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{replyingTo.text}</p>
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

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
                    ref={inputRef}
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

              {/* Partner photo lightbox */}
              {showPartnerLightbox && partnerProfilePic && (
                <Lightbox
                  photo={{ image_url: partnerProfilePic, created_at: new Date().toISOString() }}
                  onClose={() => setShowPartnerLightbox(false)}
                />
              )}
          </div>
        )}

        <ResolutionModal open={showResolution} onClose={() => setShowResolution(false)} />

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent className="w-[calc(100%-2.25rem)] max-w-[320px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this message?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteMessage}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
