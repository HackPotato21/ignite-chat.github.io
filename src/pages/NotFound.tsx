import { Button } from "@/components/ui/button";
import { MessageCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="space-y-2">
          <MessageCircle className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-xl font-semibold text-muted-foreground">
            Chat Room Not Found
          </h2>
          <p className="text-muted-foreground">
            The chat room you're looking for doesn't exist or has been removed.
          </p>
        </div>
        
        <Link to="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Back to Chat
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;