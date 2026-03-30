import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/api';
import { supabase } from '@/integrations/supabase/supabaseClient';
import { requestNotificationPermission } from '@/firebase';

const AppContext = createContext(null);

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
  onboardingComplete: false,
  assessmentCompleted: false,
  assessmentProfile: null,
  userProfilePic: localStorage.getItem('userProfilePic') || null,
  partnerProfilePic: localStorage.getItem('partnerProfilePic') || null,
  mode: localStorage.getItem('chat_mode') || 'calm',
  messages: [],
  goals: [],
  loading: true,
};

const normalizeRole = (value) =>
  (typeof value === 'string' ? value.trim().toLowerCase() : '');

const getMessageSenderId = (message) =>
  message?.sender_id ?? message?.senderId ?? message?.user_id ?? message?.userId ?? null;

const normalizeChatMessage = (message, currentUserId, mode) => {
  const senderId = getMessageSenderId(message);
  const hasExplicitOwnership = typeof message?.isMine === 'boolean';
  const isOwnedByCurrentUser = currentUserId && senderId
    ? String(senderId) === String(currentUserId)
    : null;

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
    isMine,
    sender: isAI ? 'ai' : 'user',
  };
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);

  // On mount, check for existing token and fetch user
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const syncUserState = (user) => {
  const userProfilePic = user.profile_picture_url || user.profile_pic_url || null;
  const partnerProfilePic = user.partner_profile_picture_url || user.partner_profile_pic_url || null;

  if (userProfilePic) localStorage.setItem('userProfilePic', userProfilePic);
  if (partnerProfilePic) localStorage.setItem('partnerProfilePic', partnerProfilePic);

  setState((s) => ({
    ...s,
    isAuthenticated: true,
    user,
    userName: user.name || '',
    userEmail: user.email || '',
    userRole: user.role || null,
    nickname: user.nickname || localStorage.getItem('nickname') || '',
    coupleId: user.couple_id || null,
    partnerName: user.partner_name || '',
    isLinked: user.is_linked || false,
    assessmentCompleted: user.assessment_completed || false,
    assessmentProfile: user.assessment_profile || null,
    onboardingComplete: user.onboarding_complete || false,  // ← inside setState
    userProfilePic: userProfilePic || s.userProfilePic || localStorage.getItem('userProfilePic'),
    partnerProfilePic: partnerProfilePic || s.partnerProfilePic || localStorage.getItem('partnerProfilePic'),
    loading: false,
  }));
};

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      console.log('fetchUser raw response:', data);
      syncUserState(data.user || data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState((s) => ({ ...s, ...defaultState, loading: false }));
    }
  };

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    await fetchUser();
    requestNotificationPermission(api);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    await fetchUser();
    requestNotificationPermission(api);
  }, []);

  const logout = useCallback(() => {
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
   
    setState((s) => ({ ...s, nickname }));
  }, []);

  const updateProfilePic = useCallback(async (file) => {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const fileName = `${timestamp}-${random}-${file.name}`;
      const filePath = `profile_pics/${state.user?.id || 'unknown'}/${fileName}`;

      console.log('Uploading profile pic to:', filePath);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      console.log('Generated public URL:', imageUrl);

      // Save to localStorage for persistence
      localStorage.setItem('userProfilePic', imageUrl);

      // Update state immediately with the new profile picture
      setState((s) => {
        console.log('Updating state with userProfilePic:', imageUrl);
        return {
          ...s,
          userProfilePic: imageUrl,
        };
      });

      // Save profile pic URL to backend (fire and forget - best effort)
      try {
        const { data: profileData } = await api.put('/auth/profile', {
          profile_pic_url: imageUrl,
        });
        console.log('Backend response:', profileData);
        // If backend returns updated user, sync it
        if (profileData?.user || profileData?.profile_pic_url || profileData?.profile_picture_url) {
          console.log('Syncing user state from backend response');
          syncUserState(profileData.user || profileData);
        }
      } catch (backendErr) {
        console.warn('Backend profile update failed, but image uploaded:', backendErr);
      }

      return imageUrl;
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
    try {
      const { data } = await api.get('/messages', { params: { mode } });
      setState((s) => {
        const currentUserId = s.user?.id || '';
        return {
          ...s,
          messages: (data.messages || data).map((message) =>
            normalizeChatMessage(message, currentUserId, mode)
          ),
        };
      });
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
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
      // Avoid duplicates by id
      if (msg.id && s.messages.some((m) => m.id === msg.id)) return s;
      const normalized = normalizeChatMessage(msg, s.user?.id || '', 'calm');
      return { ...s, messages: [...s.messages, normalized] };
    });
  }, []);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
