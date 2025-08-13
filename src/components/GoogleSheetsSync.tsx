import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileSpreadsheet } from 'lucide-react';

export const GoogleSheetsSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-sheets');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Sync Successful",
        description: `Updated ${data.updatedCells} cells with ${data.messageCount} messages`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data to Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Google Sheets Sync
        </CardTitle>
        <CardDescription>
          Sync chat data to your Google Sheets document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSync} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            'Sync to Google Sheets'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};