import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const defaultState = {
  isAuthenticated: false,
  userName: '',
  userEmail: '',
  userRole: null,
  coupleId: null,
  partnerName: '',
  isLinked: false,
  assessmentCompleted: false,
  assessmentAnswers: {},
  mode: 'calm',
  messages: [],
  goals: [],
};

// Helper to load persisted state and merge with defaults so optional fields are always present
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('ustwo_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Restore dates in messages if they ever get persisted in the future
      if (parsed.messages) {
        parsed.messages = parsed.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
      return { ...defaultState, ...parsed };
    }
  } catch (e) { /* ignore */ }
  return defaultState;
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(() => loadPersistedState());

  // Persist key state to localStorage
  useEffect(() => {
    const toPersist = {
      isAuthenticated: state.isAuthenticated,
      userName: state.userName,
      userEmail: state.userEmail,
      userRole: state.userRole,
      coupleId: state.coupleId,
      partnerName: state.partnerName,
      isLinked: state.isLinked,
      assessmentCompleted: state.assessmentCompleted,
      assessmentAnswers: state.assessmentAnswers,
      goals: state.goals,
      // Don't persist messages or mode — those are session-only
    };
    localStorage.setItem('ustwo_state', JSON.stringify(toPersist));
  }, [state.isAuthenticated, state.userName, state.userRole, state.coupleId, state.partnerName, state.isLinked, state.assessmentCompleted, state.assessmentAnswers, state.goals]);

  const login = useCallback((name, email) => {
    setState(s => ({ ...s, isAuthenticated: true, userName: name, userEmail: email }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ustwo_state');
    setState({ ...defaultState });
  }, []);

  const setRole = useCallback((role) => {
    setState(s => ({ ...s, userRole: role }));
  }, []);

  const generateCoupleId = useCallback(() => {
    const id = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setState(s => ({ ...s, coupleId: id }));
    return id;
  }, []);

  const linkPartner = useCallback((code, partnerName) => {
    if (code.length >= 7) {
      setState(s => ({ ...s, coupleId: code, partnerName, isLinked: true }));
      return true;
    }
    return false;
  }, []);

  const completeAssessment = useCallback((answers) => {
    setState(s => ({ ...s, assessmentCompleted: true, assessmentAnswers: answers }));
  }, []);

  const setMode = useCallback((mode) => {
    setState(s => ({ ...s, mode }));
  }, []);

  const addMessage = useCallback((msg) => {
    const newMsg = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
      mode: state.mode,
    };
    setState(s => ({ ...s, messages: [...s.messages, newMsg] }));
  }, [state.mode]);

  const clearMessages = useCallback(() => {
    setState(s => ({ ...s, messages: s.messages.filter(m => m.mode !== s.mode), mode: 'calm' }));
  }, []);

  const currentMessages = state.messages.filter(m => m.mode === state.mode);

  const addGoal = useCallback((text, tag) => {
    const goal = {
      id: Date.now().toString(),
      text,
      tag,
      setBy: state.userRole,
      date: new Date().toLocaleDateString(),
      completed: false,
    };
    setState(s => ({ ...s, goals: [...s.goals, goal] }));
  }, [state.userRole]);

  const toggleGoalComplete = useCallback((id) => {
    setState(s => ({
      ...s,
      goals: s.goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setRole, generateCoupleId, linkPartner,
      completeAssessment, setMode, addMessage, clearMessages, currentMessages, addGoal, toggleGoalComplete,
    }}>
      {children}
    </AppContext.Provider>
  );
};
