import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatContextType {
  userName: string | null;
  setUserName: (name: string) => void;
  currentRoom: string | null;
  setCurrentRoom: (roomId: string | null) => void;
  sessionId: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [userName, setUserNameState] = useState<string | null>(
    localStorage.getItem('ignite-chat-username')
  );
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('ignite-chat-session');
    if (!id) {
      id = Math.random().toString(36).substring(7);
      localStorage.setItem('ignite-chat-session', id);
    }
    return id;
  });

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem('ignite-chat-username', name);
    
    // Set the current user context for RLS using SQL
    supabase.rpc('cleanup_idle_users'); // This will trigger the context setting in the session
  };

  useEffect(() => {
    if (userName) {
      // Set the current user context for RLS on app load
      supabase.rpc('cleanup_idle_users'); // This will trigger the context setting in the session
    }
  }, [userName]);

  return (
    <ChatContext.Provider
      value={{
        userName,
        setUserName,
        currentRoom,
        setCurrentRoom,
        sessionId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};