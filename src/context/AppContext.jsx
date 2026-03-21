import React, { createContext, useContext, useState, useCallback } from 'react';



































































const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }) => {
  const [state, setState] = useState({
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
    goals: []
  });

  const login = useCallback((name, email) => {
    setState((s) => ({ ...s, isAuthenticated: true, userName: name, userEmail: email }));
  }, []);

  const logout = useCallback(() => {
    setState({
      isAuthenticated: false, userName: '', userEmail: '',
      userRole: null, coupleId: null, partnerName: '', isLinked: false,
      assessmentCompleted: false, assessmentAnswers: {},
      mode: 'calm', messages: [], goals: []
    });
  }, []);

  const setRole = useCallback((role) => {
    setState((s) => ({ ...s, userRole: role }));
  }, []);

  const generateCoupleId = useCallback(() => {
    const id = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setState((s) => ({ ...s, coupleId: id }));
    return id;
  }, []);

  const linkPartner = useCallback((code, partnerName) => {
    // In a real app, this would verify the code against a backend
    if (code.length >= 7) {
      setState((s) => ({ ...s, coupleId: code, partnerName, isLinked: true }));
      return true;
    }
    return false;
  }, []);

  const completeAssessment = useCallback((answers) => {
    setState((s) => ({ ...s, assessmentCompleted: true, assessmentAnswers: answers }));
  }, []);

  const setMode = useCallback((mode) => {
    setState((s) => ({ ...s, mode }));
  }, []);

  const addMessage = useCallback((msg) => {
    const newMsg = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
      mode: state.mode
    };
    setState((s) => ({ ...s, messages: [...s.messages, newMsg] }));
  }, [state.mode]);

  const clearMessages = useCallback(() => {
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.mode !== s.mode), mode: 'calm' }));
  }, []);

  const currentMessages = state.messages.filter((m) => m.mode === state.mode);

  const addGoal = useCallback((text, tag) => {
    const goal = {
      id: Date.now().toString(),
      text,
      tag,
      setBy: state.userRole,
      date: new Date().toLocaleDateString(),
      completed: false
    };
    setState((s) => ({ ...s, goals: [...s.goals, goal] }));
  }, [state.userRole]);

  const toggleGoalComplete = useCallback((id) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => g.id === id ? { ...g, completed: !g.completed } : g)
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setRole, generateCoupleId, linkPartner,
      completeAssessment, setMode, addMessage, clearMessages, currentMessages, addGoal, toggleGoalComplete
    }}>
      {children}
    </AppContext.Provider>);

};