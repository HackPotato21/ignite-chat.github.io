import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';
import { RoomList } from '@/components/RoomList';
import { ChatRoom } from '@/components/ChatRoom';
import { UserSetup } from '@/components/UserSetup';
import { UserProfile } from '@/components/UserProfile';
import { GoogleSheetsSync } from '@/components/GoogleSheetsSync';
import { Plus, Hash, Users, MessageSquare, Settings, Database } from 'lucide-react';

const ChatApp = () => {
  const { userName, currentRoom } = useChatContext();
  const { toast } = useToast();

  // Test database connection on load
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { count, error } = await supabase
          .from('chat_rooms')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        toast({
          title: "Database Connected",
          description: `Successfully connected to Supabase. Found ${count || 0} rooms.`,
        });
      } catch (error) {
        console.error('Database connection failed:', error);
        toast({
          title: "Database Connection Failed",
          description: "Failed to connect to database. Please check your connection.",
          variant: "destructive",
        });
      }
    };
    
    testConnection();
  }, [toast]);

  // Show user setup if no username
  if (!userName) {
    return <UserSetup />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <UserProfile />
        </div>

        {/* Room List */}
        <RoomList />

        {/* Footer with sync */}
        <div className="p-4 border-t border-border">
          <GoogleSheetsSync />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <ChatRoom />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">Welcome to Chat Room</h2>
                <p className="text-muted-foreground">
                  Select a room from the sidebar to start chatting
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
};

export default Index;