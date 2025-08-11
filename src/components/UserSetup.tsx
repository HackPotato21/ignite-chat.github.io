import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, User } from 'lucide-react';
import { useChatContext } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';

export const UserSetup = () => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUserName } = useChatContext();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    if (name.trim().length < 2) {
      toast({
        title: "Name too short",
        description: "Your name must be at least 2 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      setUserName(name.trim());
      toast({
        title: "Welcome!",
        description: `Welcome to Ignite Chat, ${name.trim()}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Ignite Chat
          </h1>
          <p className="text-muted-foreground">
            Real-time messaging with instant connections
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Enter Your Name
            </CardTitle>
            <CardDescription>
              Choose a name to start chatting with others
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="text-center text-lg h-12"
                autoFocus
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? "Setting up..." : "Start Chatting"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>No registration required • Instant access</p>
        </div>
      </div>
    </div>
  );
};