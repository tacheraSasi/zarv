import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, userOperations } from '../utils/db';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  inviteUser: (email: string, name: string, position: 'frontend' | 'backend', password: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: number, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: number) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing session on mount and seed admin user
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Seed admin user if it doesn't exist
        await userOperations.seedAdmin();

        // Check for existing session
        const sessionData = localStorage.getItem('auth_session');
        if (sessionData) {
          const { email } = JSON.parse(sessionData);
          // Directly await the promise
          const user = await userOperations.getByEmail(email);
          if (user) {
            setCurrentUser(user);
          } else {
            // Invalid session, clear it
            localStorage.removeItem('auth_session');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('auth_session');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth().then();
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
        // Directly await the promise
        const user = await userOperations.authenticate(email, password);
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

  const inviteUser = async (
    email: string,
    name: string,
    position: 'frontend' | 'backend',
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if current user is admin
      if (!currentUser?.isAdmin) {
        return { success: false, error: 'Only administrators can invite users' };
      }

      // Validate email format
      if (!email || !email.includes('@') || !email.includes('.')) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Validate name
      if (!name || name.trim() === '') {
        return { success: false, error: 'Please enter a name' };
      }

      // Check if user already exists
      const existingUser = await userOperations.getByEmail(email);
      if (existingUser) {
        return { success: false, error: 'Email already in use' };
      }

      try {
        // Create new user by admin
        const userId = await userOperations.createByAdmin(email, name, position, password);
        if (!userId) {
          return { success: false, error: 'Failed to create user account' };
        }

        return { success: true };
      } catch (innerError) {
        console.error('User creation error:', innerError);
        return {
          success: false,
          error: innerError instanceof Error ? innerError.message : 'Failed to create user account'
        };
      }
    } catch (error) {
      console.error('User invitation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during user invitation'
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_session');
  };

  const updateUser = async (
    userId: number,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if current user is admin or updating their own profile
      if (!currentUser?.isAdmin && currentUser?.id !== userId) {
        return { success: false, error: 'Only administrators can update other users' };
      }

      // Validate email format if provided
      if (data.email && (!data.email.includes('@') || !data.email.includes('.'))) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Validate name if provided
      if (data.name && data.name.trim() === '') {
        return { success: false, error: 'Please enter a name' };
      }

      try {
        // Update the user
        await userOperations.update(userId, data);

        // If updating current user, refresh the user data
        if (currentUser && currentUser.id === userId) {
          const updatedUser = await userOperations.getById(userId);
          if (updatedUser) {
            setCurrentUser(updatedUser);
            // Update session if email changed
            if (data.email) {
              localStorage.setItem('auth_session', JSON.stringify({ email: updatedUser.email }));
            }
          }
        }

        return { success: true };
      } catch (innerError) {
        console.error('User update error:', innerError);
        return {
          success: false,
          error: innerError instanceof Error ? innerError.message : 'Failed to update user'
        };
      }
    } catch (error) {
      console.error('User update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during user update'
      };
    }
  };

  const deleteUser = async (userId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if current user is admin
      if (!currentUser?.isAdmin) {
        return { success: false, error: 'Only administrators can delete users' };
      }

      // Ensure current user has an ID
      if (!currentUser.id) {
        return { success: false, error: 'Current user ID is missing' };
      }

      try {
        // Delete the user (the userOperations.delete method already prevents self-deletion)
        await userOperations.delete(userId, currentUser.id);
        return { success: true };
      } catch (innerError) {
        console.error('User deletion error:', innerError);
        return {
          success: false,
          error: innerError instanceof Error ? innerError.message : 'Failed to delete user'
        };
      }
    } catch (error) {
      console.error('User deletion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred during user deletion'
      };
    }
  };

  const value = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    isAdmin: !!currentUser?.isAdmin,
    login,
    logout,
    inviteUser,
    updateUser,
    deleteUser,
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
