import { useState } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import { UserSetup } from '@/components/UserSetup';
import { ChatLayout } from '@/components/ChatLayout';

const Index = () => {
  const { userName } = useChatContext();

  if (!userName) {
    return <UserSetup />;
  }

  return <ChatLayout />;
};

export default Index;