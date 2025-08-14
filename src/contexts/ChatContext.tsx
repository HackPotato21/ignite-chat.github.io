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

  const setUserName = async (name: string) => {
    setUserNameState(name);
    localStorage.setItem('ignite-chat-username', name);
    
    // Set the current user context for RLS
    try {
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user_name',
        setting_value: name,
        is_local: false
      });
    } catch (error) {
      console.error('Error setting user context:', error);
    }
  };

  useEffect(() => {
    if (userName) {
      // Set the current user context for RLS on app load
      supabase.rpc('set_config', {
        setting_name: 'app.current_user_name',
        setting_value: userName,
        is_local: false
      }).catch(console.error);
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