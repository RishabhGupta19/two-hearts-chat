import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type UserRole = 'gf' | 'bf' | null;
export type AppMode = 'calm' | 'vent';
export type GoalTag = 'growth' | 'us' | 'personal';

export interface Goal {
  id: string;
  text: string;
  tag: GoalTag;
  setBy: UserRole;
  date: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'partner' | 'ai';
  timestamp: Date;
  mode: AppMode;
}

export interface AssessmentAnswers {
  upsetPreference?: string;
  loveLanguage?: string;
  conflictStyle?: string;
  communicationStrength?: string;
  appreciationStyle?: string;
  stressResponse?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  userName: string;
  userEmail: string;
  // Role & linking
  userRole: UserRole;
  coupleId: string | null;
  partnerName: string;
  isLinked: boolean;
  // Assessment
  assessmentCompleted: boolean;
  assessmentAnswers: AssessmentAnswers;
  // Mode
  mode: AppMode;
  // Chat
  messages: ChatMessage[];
  // Goals
  goals: Goal[];
}

interface AppContextType extends AppState {
  login: (name: string, email: string) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  generateCoupleId: () => string;
  linkPartner: (code: string, partnerName: string) => boolean;
  completeAssessment: (answers: AssessmentAnswers) => void;
  setMode: (mode: AppMode) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'mode'>) => void;
  clearMessages: () => void;
  currentMessages: ChatMessage[];
  addGoal: (text: string, tag: GoalTag) => void;
  toggleGoalComplete: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>({
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
  });

  const login = useCallback((name: string, email: string) => {
    setState(s => ({ ...s, isAuthenticated: true, userName: name, userEmail: email }));
  }, []);

  const logout = useCallback(() => {
    setState({
      isAuthenticated: false, userName: '', userEmail: '',
      userRole: null, coupleId: null, partnerName: '', isLinked: false,
      assessmentCompleted: false, assessmentAnswers: {},
      mode: 'calm', messages: [], goals: [],
    });
  }, []);

  const setRole = useCallback((role: UserRole) => {
    setState(s => ({ ...s, userRole: role }));
  }, []);

  const generateCoupleId = useCallback(() => {
    const id = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setState(s => ({ ...s, coupleId: id }));
    return id;
  }, []);

  const linkPartner = useCallback((code: string, partnerName: string) => {
    // In a real app, this would verify the code against a backend
    if (code.length >= 7) {
      setState(s => ({ ...s, coupleId: code, partnerName, isLinked: true }));
      return true;
    }
    return false;
  }, []);

  const completeAssessment = useCallback((answers: AssessmentAnswers) => {
    setState(s => ({ ...s, assessmentCompleted: true, assessmentAnswers: answers }));
  }, []);

  const setMode = useCallback((mode: AppMode) => {
    setState(s => ({ ...s, mode }));
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp' | 'mode'>) => {
    const newMsg: ChatMessage = {
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

  const addGoal = useCallback((text: string, tag: GoalTag) => {
    const goal: Goal = {
      id: Date.now().toString(),
      text,
      tag,
      setBy: state.userRole,
      date: new Date().toLocaleDateString(),
      completed: false,
    };
    setState(s => ({ ...s, goals: [...s.goals, goal] }));
  }, [state.userRole]);

  const toggleGoalComplete = useCallback((id: string) => {
    setState(s => ({
      ...s,
      goals: s.goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g),
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setRole, generateCoupleId, linkPartner,
      completeAssessment, setMode, addMessage, clearMessages, addGoal, toggleGoalComplete,
    }}>
      {children}
    </AppContext.Provider>
  );
};
