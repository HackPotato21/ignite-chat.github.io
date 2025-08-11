import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Hash, Users, Lock } from 'lucide-react';

interface ChatRoom {
  id: string;
  room_name: string;
  room_type: 'public' | 'private';
  user_count?: number;
}

export const RoomList = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userName, currentRoom, setCurrentRoom, sessionId } = useChatContext();
  const { toast } = useToast();

  useEffect(() => {
    if (userName) {
      fetchRooms();
      subscribeToRoomChanges();
    }
  }, [userName]);

  const fetchRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get user counts for each room
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { data: count } = await supabase
            .rpc('get_active_room_user_count', { room_uuid: room.id });
          
          return {
            ...room,
            user_count: count || 0
          };
        })
      );

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToRoomChanges = () => {
    const channel = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !userName) return;

    setIsCreating(true);
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .insert({
          room_name: newRoomName.trim(),
          room_type: 'public',
          owner_name: userName,
          session_id: sessionId
        })
        .select()
        .single();

      if (error) throw error;

      // Join the room automatically
      await supabase
        .from('room_users')
        .insert({
          room_id: room.id,
          user_name: userName,
          is_owner: true
        });

      setNewRoomName('');
      setCurrentRoom(room.id);
      
      toast({
        title: "Room created!",
        description: `Successfully created "${room.room_name}".`,
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!userName) return;

    try {
      // Check if already in room
      const { data: existingUser } = await supabase
        .from('room_users')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_name', userName)
        .single();

      if (!existingUser) {
        // Join the room
        await supabase
          .from('room_users')
          .insert({
            room_id: roomId,
            user_name: userName,
            is_owner: false
          });
      }

      setCurrentRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-4">
        {/* Create Room */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Room name..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              maxLength={50}
            />
            <Button 
              onClick={createRoom}
              disabled={!newRoomName.trim() || isCreating}
              className="w-full"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Room List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-2">
            Available Rooms ({rooms.length})
          </h3>
          
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No rooms available</p>
              <p className="text-xs">Create the first room to get started!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {rooms.map((room) => (
                <Button
                  key={room.id}
                  variant={currentRoom === room.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => joinRoom(room.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {room.room_type === 'public' ? (
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {room.room_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs px-1">
                        {room.user_count || 0}
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};