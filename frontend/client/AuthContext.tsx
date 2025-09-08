import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  profile?: {
    bio?: string;
  };
  is_active: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, jwt: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      setIsLoading(true);
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Validate token format (basic check)
          if (storedToken.split('.').length === 3) {
            setUser(parsedUser);
            setToken(storedToken);
          } else {
            // Invalid token format, clear storage
            localStorage.removeItem("user");
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };

    // Load user on mount
    loadUser();

    // Listen for storage changes (when user data is updated)
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (userData: User, jwt: string) => {
    try {
      // Validate user data
      if (!userData || !userData._id || !userData.email || !jwt) {
        throw new Error("Invalid user data or token");
      }
      
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", jwt);
      setUser(userData);
      setToken(jwt);
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to save login data");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    
    // Dispatch storage event for cross-tab synchronization
    window.dispatchEvent(new Event('storage'));
    toast.success("Logged out successfully");
  };

  const isAuthenticated = !!(user && token);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};