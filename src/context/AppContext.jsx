import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/api';

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
  coupleId: null,
  partnerName: '',
  isLinked: false,
  assessmentCompleted: false,
  assessmentProfile: null,
  mode: 'calm',
  messages: [],
  goals: [],
  loading: true,
};

const normalizeChatMessage = (message, currentUserRole, mode) => {
  if (mode === 'calm') {
    return {
      ...message,
      sender: message.sender_role === currentUserRole ? 'user' : 'partner',
    };
  }

  // Vent mode: ensure sender is normalised to 'user' or 'ai'
  if (message.sender === 'user' || message.sender === 'ai') return message;
  // Fallback: if sender_role matches current user, it's theirs; otherwise AI
  if (message.sender_role) {
    return { ...message, sender: message.sender_role === currentUserRole ? 'user' : 'ai' };
  }
  // If role field is present
  if (message.role === 'assistant' || message.role === 'ai') {
    return { ...message, sender: 'ai' };
  }
  if (message.role === 'user') {
    return { ...message, sender: 'user' };
  }
  return message;
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
    setState((s) => ({
      ...s,
      isAuthenticated: true,
      user,
      userName: user.name || '',
      userEmail: user.email || '',
      userRole: user.role || null,
      coupleId: user.couple_id || null,
      partnerName: user.partner_name || '',
      isLinked: user.is_linked || false,
      assessmentCompleted: user.assessment_completed || false,
      assessmentProfile: user.assessment_profile || null,
      loading: false,
    }));
  };

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
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
    syncUserState(data.user);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    syncUserState(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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

  const setMode = useCallback((mode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  // Fetch messages from API by mode
  const fetchMessages = useCallback(async (mode) => {
    try {
      const { data } = await api.get('/messages', { params: { mode } });
      setState((s) => ({
        ...s,
        messages: (data.messages || data).map((message) => normalizeChatMessage(message, s.userRole, mode)),
      }));
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    try {
      // Save user message
      const { data: userMsg } = await api.post('/messages', { text, mode: state.mode });
      setState((s) => ({ ...s, messages: [...s.messages, userMsg] }));

      // Get AI response
      const { data: aiMsg } = await api.post('/chat/ai-respond', { message: text, mode: state.mode });
      setState((s) => ({ ...s, messages: [...s.messages, aiMsg] }));
      return aiMsg;
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
        setState((s) => ({ ...s, messages: [...s.messages, aiFallback] }));
        return aiFallback;
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
      const normalized = normalizeChatMessage(msg, s.userRole, 'calm');
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
