import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, Hash, MessageSquare } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  user_name: string;
  message: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
}

interface RoomUser {
  user_name: string;
  last_activity: string;
  is_owner: boolean;
}

export const ChatRoom = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { userName, currentRoom } = useChatContext();
  const { toast } = useToast();

  useEffect(() => {
    if (currentRoom && userName) {
      fetchRoomData();
      fetchMessages();
      subscribeToMessages();
      subscribeToRoomUsers();
      
      // Update user activity
      updateUserActivity();
      const activityInterval = setInterval(updateUserActivity, 30000); // Every 30 seconds

      return () => {
        clearInterval(activityInterval);
        leaveRoom();
      };
    }
  }, [currentRoom, userName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRoomData = async () => {
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('room_name')
        .eq('id', currentRoom)
        .single();

      if (error) throw error;
      setRoomName(room.room_name);
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoom)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('room_users')
        .select('user_name, last_activity, is_owner')
        .eq('room_id', currentRoom)
        .gt('last_activity', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Active in last 10 minutes

      if (error) throw error;
      setRoomUsers(data || []);
    } catch (error) {
      console.error('Error fetching room users:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoom}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToRoomUsers = () => {
    const channel = supabase
      .channel('room-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_users',
          filter: `room_id=eq.${currentRoom}`
        },
        () => {
          fetchRoomUsers();
        }
      )
      .subscribe();

    fetchRoomUsers();
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateUserActivity = async () => {
    if (!userName || !currentRoom) return;
    
    try {
      await supabase
        .from('room_users')
        .upsert({
          room_id: currentRoom,
          user_name: userName,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_name'
        });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  };

  const leaveRoom = async () => {
    if (!userName || !currentRoom) return;
    
    try {
      await supabase.rpc('cleanup_user_from_room_beacon', {
        p_room_id: currentRoom,
        p_user_name: userName
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userName || !currentRoom || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: currentRoom,
          user_name: userName,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd HH:mm');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <MessageSquare className="w-8 h-8 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">{roomName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline">
              {roomUsers.length} online
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Be the first to start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_name === userName ? 'justify-end' : 'justify-start'} message-enter`}
              >
                <Card className={`max-w-[70%] ${
                  message.user_name === userName 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card'
                }`}>
                  <div className="p-3 space-y-1">
                    {message.user_name !== userName && (
                      <div className="text-xs font-medium text-muted-foreground">
                        {message.user_name}
                      </div>
                    )}
                    <div className="text-sm break-words">
                      {message.message}
                    </div>
                    <div className={`text-xs ${
                      message.user_name === userName 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={isSending}
            className="flex-1"
            maxLength={1000}
          />
          <Button 
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};