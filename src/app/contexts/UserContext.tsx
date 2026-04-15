import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User } from "../types/messenger";

interface UserProfile extends User {
  username?: string;
  bio?: string;
  avatar?: string;
  email?: string;
}

interface UserContextType {
  user: UserProfile | null;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем данные пользователя из localStorage при монтировании
  useEffect(() => {
    const loadUser = () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const userData = localStorage.getItem('registeredUser');
      
      if (isAuthenticated && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Преобразуем данные из API в UserProfile
          // Сервер возвращает: id, email, name, avatar_url, status
          const userProfile: UserProfile = {
            id: parsedUser.id || `user-${Date.now()}`,
            name: parsedUser.name || parsedUser.email?.split('@')[0] || "Пользователь",
            username: parsedUser.username || parsedUser.email?.split('@')[0]?.toLowerCase() || "user",
            bio: parsedUser.bio || "",
            status: parsedUser.status || "online",
            avatar: parsedUser.avatar_url || parsedUser.avatar || "",
            email: parsedUser.email || "",
          };
          setUser(userProfile);
        } catch (error) {
          console.error("Failed to parse user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Сохраняем обновленные данные в localStorage
      const userData = localStorage.getItem('registeredUser');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          localStorage.setItem('registeredUser', JSON.stringify({
            ...parsedUser,
            name: updated.name,
            avatar: updated.avatar,
            avatar_url: updated.avatar, // Сохраняем и avatar_url для совместимости с сервером
            bio: updated.bio,
          }));
        } catch (error) {
          console.error("Failed to update user data in localStorage:", error);
        }
      }
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('registeredUser');
    localStorage.removeItem('currentUserId');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, updateUser, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
