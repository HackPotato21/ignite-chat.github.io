import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useChatContext } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export const UserProfile = () => {
  const { userName, setUserName } = useChatContext();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    // Clear user data
    localStorage.removeItem('ignite-chat-username');
    localStorage.removeItem('ignite-chat-session');
    setUserName('');
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="border-t border-border p-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{userName}</div>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                Online
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 mr-2" />
              ) : (
                <Moon className="w-4 h-4 mr-2" />
              )}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};