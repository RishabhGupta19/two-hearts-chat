import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/api';
import { supabase } from '@/integrations/supabase/supabaseClient';
import { requestNotificationPermission, subscribeToForegroundMessages } from '@/firebase';

const AppContext = createContext(null);
const MUSIC_STATE_STORAGE_KEY = 'music_player_state_v1';
const CACHED_USER_KEY = 'cached_user_v1';

// ---------------------------------------------------------------------------
// Cached user snapshot — lets the app hydrate instantly on PWA resumes
// without waiting for a network round-trip to /auth/me.
// ---------------------------------------------------------------------------
const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    // Only store the fields we need for instant hydration — no PII blobs.
    const snapshot = {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || null,
      nickname: user.nickname || '',
      onboarding_complete: user.onboarding_complete || false,
      assessment_completed: user.assessment_completed || false,
      assessment_profile: user.assessment_profile || null,
      couple_id: user.couple_id || null,
      partner_name: user.partner_name || '',
      is_linked: user.is_linked || false,
      profile_picture_url: user.profile_picture_url || user.profile_pic_url || null,
      partner_profile_picture_url: user.partner_profile_picture_url || user.partner_profile_pic_url || null,
    };
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
};

const clearCachedUser = () => {
  try { localStorage.removeItem(CACHED_USER_KEY); } catch { /* ignore */ }
};

const readPersistedMusicState = () => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(MUSIC_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      currentSong: parsed.currentSong || null,
      currentQueue: Array.isArray(parsed.currentQueue) ? parsed.currentQueue : [],
      currentIndex: Number.isFinite(parsed.currentIndex) ? parsed.currentIndex : 0,
      musicWasPlaying: Boolean(parsed.musicWasPlaying),
      musicPosition: Number.isFinite(parsed.musicPosition) ? parsed.musicPosition : 0,
    };
  } catch {
    return null;
  }
};

const persistedMusicState = readPersistedMusicState();

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const defaultState = {
  isAuthenticated: false,
  user: null,
  userName: '',
  userEmail: '',
  userRole: null,
  nickname: '',
  coupleId: null,
  partnerName: '',
  isLinked: false,
  onboardingComplete: (typeof localStorage !== 'undefined' && localStorage.getItem('onboarding_complete') === 'true') || false,
  assessmentCompleted: false,
  assessmentProfile: null,
  userProfilePic: localStorage.getItem('userProfilePic') || null,
  partnerProfilePic: localStorage.getItem('partnerProfilePic') || null,
  mode: localStorage.getItem('chat_mode') || 'calm',
  messages: [],
  goals: [],
  currentSong: persistedMusicState?.currentSong || null,
  currentQueue: persistedMusicState?.currentQueue || [],
  currentIndex: persistedMusicState?.currentIndex || 0,
  musicWasPlaying: persistedMusicState?.musicWasPlaying || false,
  musicPosition: persistedMusicState?.musicPosition || 0,
  loading: true,
};

const normalizeRole = (value) =>
  (typeof value === 'string' ? value.trim().toLowerCase() : '');

const getMessageSenderId = (message) =>
  message?.sender_id ?? message?.senderId ?? message?.user_id ?? message?.userId ?? null;

const normalizeTimestampInput = (value) => {
  if (typeof value !== 'string') return value;
  const hasZone = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value);
  return hasZone ? value : `${value}Z`;
};

const toTimestamp = (value) => {
  const t = Date.parse(normalizeTimestampInput(value) || '');
  return Number.isNaN(t) ? 0 : t;
};

const sortMessagesAsc = (messages) =>
  [...messages].sort((a, b) => toTimestamp(a?.timestamp) - toTimestamp(b?.timestamp));

const mergeUniqueById = (existing, incoming) => {
  const seen = new Set();
  const out = [];
  for (const m of [...existing, ...incoming]) {
    const key = m?.id ? String(m.id) : `${m?.timestamp || ''}:${m?.text || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return sortMessagesAsc(out);
};

const readRecentCache = (mode) => {
  try {
    const raw = localStorage.getItem(`chat_recent_${mode}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecentCache = (mode, messages) => {
  try {
    localStorage.setItem(`chat_recent_${mode}`, JSON.stringify((messages || []).slice(-40)));
  } catch {
    // ignore storage errors
  }
};

const normalizeChatMessage = (message, currentUserId, mode) => {
  const senderId = getMessageSenderId(message);
  const hasExplicitOwnership = typeof message?.isMine === 'boolean';
  const isOwnedByCurrentUser = currentUserId && senderId
    ? String(senderId) === String(currentUserId)
    : null;
  const replyTo = message?.replyTo || (message?.reply_to?.id && message?.reply_to?.text
    ? { messageId: message.reply_to.id, text: message.reply_to.text }
    : null);

  if (mode === 'calm') {
    const isMine = hasExplicitOwnership
      ? message.isMine
      : isOwnedByCurrentUser !== null
        ? isOwnedByCurrentUser
        : message.sender === 'user' ||
          message.role === 'user' ||
          message.is_self === true ||
          message.mine === true;

    return {
      ...message,
      replyTo,
      is_deleted: Boolean(message?.is_deleted),
      isMine,
      sender: isMine ? 'user' : 'partner',
    };
  }

  const isAI =
    message.sender === 'ai' ||
    message.role === 'assistant' ||
    message.role === 'ai';

  const isMine = isAI
    ? false
    : hasExplicitOwnership
      ? message.isMine
      : isOwnedByCurrentUser !== null
        ? isOwnedByCurrentUser
        : message.sender === 'user' ||
          message.role === 'user' ||
          message.is_self === true ||
          message.mine === true;

  return {
    ...message,
    replyTo,
    is_deleted: Boolean(message?.is_deleted),
    isMine,
    sender: isAI ? 'ai' : 'user',
  };
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);

  // -------------------------------------------------------------------------
  // On mount: optimistically hydrate from the cached user snapshot so the
  // app is immediately usable (no spinner on PWA resume), then verify with
  // the backend in the background and refresh state silently.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Hydrate from cache immediately — removes the full-screen spinner on
    // every cold start / PWA resume.
    const cached = readCachedUser();
    if (cached) {
      // Apply cached snapshot so the UI renders without waiting on the network.
      syncUserState(cached);
      // Then verify in the background; syncUserState will update on success.
      (async () => {
        const user = await fetchUser();
        if (user) {
          try {
            requestNotificationPermission(api, user.id);
          } catch (e) {
            console.warn('Failed to request notification permission on mount', e);
          }
        }
      })();
    } else {
      // No cache — show spinner until network resolves.
      (async () => {
        const user = await fetchUser();
        try {
          if (user) requestNotificationPermission(api, user.id);
        } catch (e) {
          console.warn('Failed to request notification permission on mount', e);
        }
      })();
    }

    // Safety net: if loading is still true after 5 seconds (e.g. network
    // hang, firebase crash, unhandled rejection), force it off so the user
    // isn't stuck on a blank screen forever.
    const safetyTimer = setTimeout(() => {
      setState((s) => {
        if (s.loading) {
          console.warn('Safety timeout: forcing loading=false after 5s');
          return { ...s, loading: false };
        }
        return s;
      });
    }, 5000);

    // Listen for forced logout dispatched by the API interceptor when the
    // refresh token has also expired.
    const handleForcedLogout = () => {
      clearCachedUser();
      localStorage.removeItem('onboarding_complete');
      setState({ ...defaultState, loading: false });
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('auth:logout', handleForcedLogout);
    };
  }, []);

  const syncUserState = (user) => {
    const userProfilePic = user.profile_picture_url || user.profile_pic_url || null;
    const partnerProfilePic = user.partner_profile_picture_url || user.partner_profile_pic_url || null;

    // Persist or clear profile pics in localStorage based on backend truth
    try {
      if (userProfilePic) localStorage.setItem('userProfilePic', userProfilePic);
      else localStorage.removeItem('userProfilePic');
      if (partnerProfilePic) localStorage.setItem('partnerProfilePic', partnerProfilePic);
      else localStorage.removeItem('partnerProfilePic');
    } catch (e) {
      // ignore storage errors
    }

    // Persist a minimal user snapshot for instant hydration on next PWA open.
    writeCachedUser(user);

    setState((s) => ({
      ...s,
      isAuthenticated: true,
      user,
      userName: user.name || '',
      userEmail: user.email || '',
      userRole: user.role || null,
      // Prefer backend nickname, fall back to locally saved nickname to avoid
      // re-prompting the user if the backend hasn't persisted it yet.
      nickname: user.nickname || localStorage.getItem('nickname') || '',
      // Respect backend onboarding flag, fall back to locally stored flag
      onboardingComplete: user.onboarding_complete || localStorage.getItem('onboarding_complete') === 'true',
      coupleId: user.couple_id || null,
      partnerName: user.partner_name || '',
      isLinked: user.is_linked || false,
      assessmentCompleted: user.assessment_completed || false,
      assessmentProfile: user.assessment_profile || null,
      // Use backend-provided pics (no silent fallback to previous session)
      userProfilePic: userProfilePic,
      partnerProfilePic: partnerProfilePic,
      loading: false,
    }));
  };

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const user = data.user || data;
      syncUserState(user);
      return user;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        // Explicit 401 that the refresh interceptor couldn't recover from —
        // the session is genuinely expired. Clear everything.
        clearCachedUser();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('onboarding_complete');
        setState((s) => ({ ...s, ...defaultState, loading: false }));
      } else {
        // Network error, server error, or offline — don't log the user out.
        // Just stop showing the loading spinner; cached state stays intact.
        console.warn('fetchUser failed (non-auth error), keeping existing session:', err?.message || err);
        setState((s) => ({ ...s, loading: false }));
      }
    }
  };

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const user = await fetchUser();
    requestNotificationPermission(api, user?.id);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const user = await fetchUser();
    requestNotificationPermission(api, user?.id);
  }, []);

  const logout = useCallback(() => {
    clearCachedUser();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('onboarding_complete');
    setState({ ...defaultState, loading: false });
  }, []);

  const setRole = useCallback(async (role) => {
    const { data } = await api.put('/auth/role', { role });
    syncUserState(data.user || data);
  }, []);

  const generateCoupleId = useCallback(async () => {
    const { data } = await api.post('/couple/generate-code');
    setState((s) => ({ ...s, coupleId: data.code }));
    return data.code;
  }, []);

  const linkPartner = useCallback(async (code, partnerName) => {
    const { data } = await api.post('/couple/link', { code, partner_name: partnerName });
    setState((s) => ({
      ...s,
      coupleId: data.couple_id,
      partnerName,
      isLinked: true,
    }));
    return true;
  }, []);

  const completeAssessment = useCallback((profile) => {
    setState((s) => ({ ...s, assessmentCompleted: true, assessmentProfile: profile }));
  }, []);

  const setNickname = useCallback((nickname) => {
    // Persist to localStorage so the app can avoid asking again on next login
   
    try {
      localStorage.setItem('nickname', nickname);
    } catch (e) {
      // ignore storage errors
    }

    try {
      localStorage.setItem('onboarding_complete', 'true');
    } catch (e) {
      // ignore
    }

    setState((s) => ({ ...s, nickname, onboardingComplete: true }));
  }, []);

  const updateProfilePic = useCallback(async (file) => {
    // Upload via backend Cloudinary endpoint
    try {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) throw new Error('Invalid file type');
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) throw new Error('File too large (max 2MB)');

      const form = new FormData();
      form.append('image', file);

      const { data } = await api.post('/auth/upload-profile-pic', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const user = data.user || data;
      const pic = user.profile_picture_url || user.profile_pic_url || user.profilePictureUrl || null;
      if (pic) {
        try {
          localStorage.setItem('userProfilePic', pic);
        } catch {}
      }
      // Sync user state from backend
      syncUserState(user);
      return pic;
    } catch (err) {
      console.error('Failed to update profile pic:', err);
      throw err;
    }
  }, [state.user?.id]);

  const removeProfilePic = useCallback(async () => {
    try {
      // Remove from localStorage
      localStorage.removeItem('userProfilePic');
      
      // Update state immediately
      setState((s) => ({
        ...s,
        userProfilePic: null,
      }));

      // Remove from backend (fire and forget - best effort)
      try {
        const { data: profileData } = await api.put('/auth/profile', {
          profile_pic_url: null,
        });
        // If backend returns updated user, sync it
        if (profileData?.user || profileData?.profile_pic_url !== undefined) {
          syncUserState(profileData.user || profileData);
        }
      } catch (backendErr) {
        console.warn('Backend profile update failed, but locally removed:', backendErr);
      }
    } catch (err) {
      console.error('Failed to remove profile pic:', err);
      throw err;
    }
  }, []);

  const setMode = useCallback((mode) => {
    localStorage.setItem('chat_mode', mode);
    setState((s) => ({ ...s, mode }));
  }, []);

  // Fetch messages from API by mode
  const fetchMessages = useCallback(async (mode) => {
    const cached = readRecentCache(mode);
    if (cached.length) {
      setState((s) => ({
        ...s,
        messages: sortMessagesAsc(cached),
      }));
    }

    try {
      const { data } = await api.get('/messages', { params: { mode, limit: 50 } });
      setState((s) => {
        const currentUserId = s.user?.id || '';
        const normalized = (data.messages || data).map((message) =>
          normalizeChatMessage(message, currentUserId, mode)
        );
        writeRecentCache(mode, normalized);
        return {
          ...s,
          messages: sortMessagesAsc(normalized),
        };
      });
      return {
        hasMore: Boolean(data?.has_more),
        loaded: (data?.messages || []).length,
        oldestTimestamp: data?.oldest_timestamp || null,
      };
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      return { hasMore: false, loaded: 0, oldestTimestamp: null };
    }
  }, []);

  const loadOlderMessages = useCallback(async (mode, before) => {
    try {
      if (!before) {
        return { hasMore: false, loaded: 0, oldestTimestamp: null };
      }

      const { data } = await api.get('/messages', {
        params: { mode, limit: 50, before },
      });
      const returned = data?.messages || [];

      setState((s) => {
        const currentUserId = s.user?.id || '';
        const normalized = returned.map((message) =>
          normalizeChatMessage(message, currentUserId, mode)
        );
        return {
          ...s,
          messages: mergeUniqueById(s.messages, normalized),
        };
      });

      return {
        hasMore: Boolean(data?.has_more),
        loaded: returned.length,
        oldestTimestamp: data?.oldest_timestamp || null,
      };
    } catch (e) {
      console.error('Failed to load older messages:', e);
      return { hasMore: false, loaded: 0, oldestTimestamp: null };
    }
  }, []);

  // Subscribe to foreground push messages and show a browser notification
  useEffect(() => {
    const recentForegroundKeys = new Map();

    const unsubscribe = subscribeToForegroundMessages((payload) => {
      try {
        // Play sound / UI handling (existing behavior may live elsewhere)
        // Additionally show a system notification when the app is foregrounded.
        if (Notification.permission === 'granted') {
          const title = payload?.notification?.title || payload?.data?.title || 'Solace';
          const body = payload?.notification?.body || payload?.data?.body || '';
          const dedupeKey = payload?.data?.message_id
            || payload?.data?.notification_id
            || payload?.data?.messageId
            || payload?.messageId
            || `${title}::${body}`;

          const now = Date.now();
          const prev = recentForegroundKeys.get(dedupeKey);
          if (prev && now - prev < 8000) return;
          recentForegroundKeys.set(dedupeKey, now);

          for (const [k, ts] of recentForegroundKeys.entries()) {
            if (now - ts > 60000) recentForegroundKeys.delete(k);
          }

          const options = {
            body,
            icon: '/icon-192.png',
            // badge-72.png does not exist in public/ — omit to avoid broken resource
            data: payload?.data || {},
            tag: payload?.data?.tag || String(dedupeKey || 'solace-message'),
            renotify: true,
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
          };

          navigator.serviceWorker.ready.then((registration) => {
            try {
              registration.showNotification(title, options);
            } catch (err) {
              console.error('Failed to show foreground notification via SW registration', err);
            }
          }).catch((err) => console.error('Service worker not ready for notifications', err));
        }
      } catch (err) {
        console.error('Error showing foreground notification', err);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (text) => {
    try {
      // Save user message
      const { data: userMsg } = await api.post('/messages', { text, mode: state.mode });
      setState((s) => ({
        ...s,
        messages: [...s.messages, normalizeChatMessage(userMsg, s.user?.id || '', s.mode)],
      }));

      // Get AI response
      const { data: aiMsg } = await api.post('/chat/ai-respond', { message: text, mode: state.mode });
      const normalizedAiMsg = normalizeChatMessage(aiMsg, state.user?.id || '', state.mode);
      setState((s) => ({
        ...s,
        messages: [...s.messages, normalizeChatMessage(aiMsg, s.user?.id || '', s.mode)],
      }));
      return normalizedAiMsg;
    } catch (e) {
      // More verbose logging for debugging backend 500s
      console.error('Failed to send message:', e?.message || e);
      if (e?.response) {
        console.error('Response status:', e.response.status);
        console.error('Response data:', e.response.data);
      }
      console.error('Request payload example:', { message: text, mode: state.mode });
      // If the error indicates an invalid/absent AI key or AI gateway problem,
      // fall back to a local canned AI response so the chat remains usable.
      const body = e?.response?.data || '';
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      const looksLikeKeyError = /key not valid|invalid api key|INVALID_ARGUMENT|LOVABLE_API_KEY|not configured/i.test(bodyStr || e?.message || '');
      const looksLikeGatewayError = e?.response?.status >= 500 || /AI service error|gateway/i.test(bodyStr || '');

      if (looksLikeKeyError || looksLikeGatewayError) {
        console.warn('Using local AI fallback reply due to upstream error.');
        const aiFallback = {
          id: Date.now().toString(),
          sender: 'ai',
          text: "I'm having trouble reaching my AI service right now. Here's a supportive reply: I hear you — tell me more when you're ready.",
          timestamp: new Date().toISOString(),
          mode: state.mode,
        };
        const normalizedFallback = normalizeChatMessage(aiFallback, state.user?.id || '', state.mode);
        setState((s) => ({ ...s, messages: [...s.messages, normalizedFallback] }));
        return normalizedFallback;
      }

      // Re-throw with some context so callers (UI) can present a friendly message
      const err = new Error(e?.response?.data?.error || e.message || 'Failed to send message');
      err.details = e;
      throw err;
    }
  }, [state.mode]);

  const addWsMessage = useCallback((msg) => {
    setState((s) => {
      const normalized = normalizeChatMessage(msg, s.user?.id || '', 'calm');
      const pendingFlag = Boolean(msg?.pending);
      const incomingId = normalized?.id ? String(normalized.id) : null;
      const incomingTempId = normalized?.client_temp_id || normalized?.tempId || null;

      const next = [...s.messages];

      if (incomingId) {
        const byId = next.findIndex((m) => String(m?.id || '') === incomingId);
        if (byId !== -1) {
          next[byId] = { ...next[byId], ...normalized, pending: false };
          return { ...s, messages: next };
        }
      }

      if (incomingTempId) {
        const byTemp = next.findIndex(
          (m) => (m?.client_temp_id || m?.tempId || null) === incomingTempId
        );
        if (byTemp !== -1) {
          const stableLocalKey = next[byTemp]?.local_key || incomingTempId;
          next[byTemp] = {
            ...next[byTemp],
            ...normalized,
            local_key: stableLocalKey,
            pending: false,
          };
          return { ...s, messages: next };
        }
      }

      // Fallback reconciliation: if temp id is unavailable in echo,
      // replace the latest pending own message with the same text.
      if (normalized?.isMine && normalized?.text) {
        const pendingIdx = [...next]
          .map((m, idx) => ({ m, idx }))
          .reverse()
          .find(({ m }) => m?.pending && m?.isMine && (m?.text || '').trim() === (normalized.text || '').trim())?.idx;

        if (pendingIdx !== undefined) {
          const stableLocalKey = next[pendingIdx]?.local_key || next[pendingIdx]?.client_temp_id || next[pendingIdx]?.id;
          next[pendingIdx] = {
            ...next[pendingIdx],
            ...normalized,
            local_key: stableLocalKey,
            pending: false,
          };
          return { ...s, messages: next };
        }
      }

      return { ...s, messages: [...next, { ...normalized, pending: pendingFlag }] };
    });
  }, []);

  const removeMessageByTempId = useCallback((tempId) => {
    if (!tempId) return;
    setState((s) => ({
      ...s,
      messages: s.messages.filter(
        (m) => (m?.client_temp_id || m?.tempId || m?.local_key) !== tempId
      ),
    }));
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`);
    setState((s) => {
      const normalized = normalizeChatMessage(data, s.user?.id || '', s.mode);
      return {
        ...s,
        messages: s.messages.map((m) => (String(m.id) === String(messageId) ? { ...m, ...normalized } : m)),
      };
    });
    return data;
  }, []);

  const searchMessages = useCallback(async (params) => {
    const { query, mode, chatId, limit = 30 } = params || {};
    if ((mode || state.mode) !== 'calm') return [];
    if (!String(query || '').trim()) return [];
    const { data } = await api.get('/messages/search', {
      params: {
        query: String(query).trim(),
        mode,
        chatId,
        limit,
      },
    });
    const currentUserId = state.user?.id || '';
    return (data?.results || []).map((m) => normalizeChatMessage(m, currentUserId, mode || state.mode));
  }, [state.mode, state.user?.id]);

  const fetchMessageContext = useCallback(async (params) => {
    const { messageId, mode, window = 6 } = params || {};
    if ((mode || state.mode) !== 'calm') return { messages: [], targetId: null };
    if (!messageId) return { messages: [], targetId: null };

    const { data } = await api.get('/messages/context', {
      params: {
        messageId,
        mode: mode || state.mode,
        window,
      },
    });

    const currentUserId = state.user?.id || '';
    const normalized = (data?.messages || []).map((m) => normalizeChatMessage(m, currentUserId, mode || state.mode));
    return {
      messages: normalized,
      targetId: data?.target_id || null,
    };
  }, [state.mode, state.user?.id]);

  const resolveVent = useCallback(async () => {
    try {
      await api.post('/chat/resolve');
      setState((s) => ({ ...s, messages: [], mode: 'calm' }));
    } catch (e) {
      console.error('Failed to resolve:', e);
    }
  }, []);

  const currentMessages = state.messages;

  // Goals
  const fetchGoals = useCallback(async () => {
    try {
      const { data } = await api.get('/goals');
      setState((s) => ({ ...s, goals: data.goals || data }));
    } catch (e) {
      console.error('Failed to fetch goals:', e);
    }
  }, []);

  const addGoal = useCallback(async (text, tag) => {
    try {
      const { data } = await api.post('/goals', { text, tag });
      setState((s) => ({ ...s, goals: [...s.goals, data] }));
    } catch (e) {
      console.error('Failed to add goal:', e);
    }
  }, []);

  const toggleGoalComplete = useCallback(async (id) => {
    try {
      const { data } = await api.patch(`/goals/${id}/toggle`);
      setState((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? data : g)),
      }));
    } catch (e) {
      console.error('Failed to toggle goal:', e);
    }
  }, []);

  const editGoal = useCallback(async (id, text, tag) => {
    const { data } = await api.patch(`/goals/${id}`, { text, tag });
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? data : g)),
    }));
  }, []);

  const deleteGoal = useCallback(async (id) => {
    await api.delete(`/goals/${id}`);
    setState((s) => ({
      ...s,
      goals: s.goals.filter((g) => g.id !== id),
    }));
  }, []);

  // Global music player state (persists across routes while app is open)
  const startMusicPlayback = useCallback((song, queue = []) => {
    if (!song) return;
    const normalizedQueue = Array.isArray(queue) ? queue : [];
    const index = normalizedQueue.findIndex((item) => item?.videoId === song?.videoId);

    setState((s) => ({
      ...s,
      currentSong: song,
      currentQueue: normalizedQueue,
      currentIndex: index >= 0 ? index : 0,
      musicWasPlaying: true,
      musicPosition: 0,
    }));
  }, []);

  const playNextTrack = useCallback(() => {
    setState((s) => {
      if (s.currentIndex >= s.currentQueue.length - 1) return s;
      const nextIndex = s.currentIndex + 1;
      return {
        ...s,
        currentIndex: nextIndex,
        currentSong: s.currentQueue[nextIndex] || s.currentSong,
        musicPosition: 0,
        musicWasPlaying: true,
      };
    });
  }, []);

  const playPrevTrack = useCallback(() => {
    setState((s) => {
      if (s.currentIndex <= 0) return s;
      const prevIndex = s.currentIndex - 1;
      return {
        ...s,
        currentIndex: prevIndex,
        currentSong: s.currentQueue[prevIndex] || s.currentSong,
        musicPosition: 0,
        musicWasPlaying: true,
      };
    });
  }, []);

  const updateMusicPlayback = useCallback(({ isPlaying, currentTime }) => {
    setState((s) => ({
      ...s,
      musicWasPlaying: typeof isPlaying === 'boolean' ? isPlaying : s.musicWasPlaying,
      musicPosition: Number.isFinite(currentTime) ? currentTime : s.musicPosition,
    }));
  }, []);

  const closeMusicPlayer = useCallback(() => {
    setState((s) => ({
      ...s,
      currentSong: null,
      currentQueue: [],
      currentIndex: 0,
      musicWasPlaying: false,
      musicPosition: 0,
    }));
  }, []);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;

    if (!state.currentSong) {
      localStorage.removeItem(MUSIC_STATE_STORAGE_KEY);
      return;
    }

    try {
      localStorage.setItem(
        MUSIC_STATE_STORAGE_KEY,
        JSON.stringify({
          currentSong: state.currentSong,
          currentQueue: state.currentQueue,
          currentIndex: state.currentIndex,
          musicWasPlaying: state.musicWasPlaying,
          musicPosition: state.musicPosition,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [state.currentSong, state.currentQueue, state.currentIndex, state.musicWasPlaying, state.musicPosition]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        setRole,
        generateCoupleId,
        linkPartner,
        completeAssessment,
        setNickname,
        updateProfilePic,
        removeProfilePic,
        setMode,
        sendMessage,
        fetchMessages,
        resolveVent,
        currentMessages,
        addGoal,
        toggleGoalComplete,
        editGoal,
        deleteGoal,
        fetchGoals,
        fetchUser,
        addWsMessage,
        removeMessageByTempId,
        loadOlderMessages,
        startMusicPlayback,
        playNextTrack,
        playPrevTrack,
        closeMusicPlayer,
        updateMusicPlayback,
        deleteMessage,
        searchMessages,
        fetchMessageContext,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
