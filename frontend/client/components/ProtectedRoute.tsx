import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate(redirectTo);
        return;
      }

      if (requiredRole.length > 0 && user && !requiredRole.includes(user.role)) {
        navigate("/");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, requiredRole, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole.length > 0 && user && !requiredRole.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}