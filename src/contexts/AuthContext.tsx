import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, userOperations, safePromise } from '../utils/db';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('auth_session');
        if (sessionData) {
          const { email } = JSON.parse(sessionData);
          // Use safePromise to ensure proper Promise handling
          const user = await safePromise(userOperations.getByEmail(email));
          if (user) {
            setCurrentUser(user);
          } else {
            // Invalid session, clear it
            localStorage.removeItem('auth_session');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('auth_session');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate email format
      if (!email || !email.includes('@') || !email.includes('.')) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Validate password
      if (!password) {
        return { success: false, error: 'Please enter your password' };
      }

      try {
        // Authenticate user with safePromise to ensure proper Promise handling
        const user = await safePromise(userOperations.authenticate(email, password));
        if (!user) {
          return { success: false, error: 'Invalid email or password' };
        }

        // Set current user and store session
        setCurrentUser(user);
        localStorage.setItem('auth_session', JSON.stringify({ email: user.email }));
        return { success: true };
      } catch (innerError) {
        console.error('Authentication error:', innerError);
        return {
          success: false,
          error: innerError instanceof Error ? innerError.message : 'Failed to authenticate user'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during login'
      };
    }
  };

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate email format
      if (!email || !email.includes('@') || !email.includes('.')) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Check if user already exists with safePromise to ensure proper Promise handling
      const existingUser = await safePromise(userOperations.getByEmail(email));
      if (existingUser) {
        return { success: false, error: 'Email already in use' };
      }

      try {
        // Create new user with safePromise to ensure proper Promise handling
        const userId = await safePromise(userOperations.create(email, password));
        if (!userId) {
          return { success: false, error: 'Failed to create user account' };
        }

        // Get the newly created user with safePromise to ensure proper Promise handling
        const user = await safePromise(userOperations.getByEmail(email));
        if (!user) {
          return { success: false, error: 'User created but could not be retrieved' };
        }

        // Set current user and store session
        setCurrentUser(user);
        localStorage.setItem('auth_session', JSON.stringify({ email: user.email }));
        return { success: true };
      } catch (innerError) {
        console.error('User creation error:', innerError);
        return {
          success: false,
          error: innerError instanceof Error ? innerError.message : 'Failed to create user account'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during registration'
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_session');
  };

  const value = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Authentication guard component
interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : null;
};
