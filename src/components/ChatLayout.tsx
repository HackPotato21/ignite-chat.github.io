import { useState } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import { RoomList } from '@/components/RoomList';
import { ChatRoom } from '@/components/ChatRoom';
import { UserProfile } from '@/components/UserProfile';
import { GoogleSheetsSync } from '@/components/GoogleSheetsSync';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

export const ChatLayout = () => {
  const { currentRoom } = useChatContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-card border-r border-border transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-80' : 'w-0'
      } overflow-hidden`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">Ignite Chat</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <RoomList />
          <div className="p-4 border-t border-border">
            <GoogleSheetsSync />
          </div>
          <UserProfile />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile sidebar toggle */}
        {!sidebarOpen && (
          <div className="p-2 border-b border-border lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {currentRoom ? (
          <ChatRoom />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-4 max-w-md mx-auto px-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Welcome to Ignite Chat</h2>
              <p className="text-muted-foreground">
                Select a room from the sidebar to start chatting, or create a new room to get the conversation started!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};