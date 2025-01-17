import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserData {
  photo?: string;
  username?: string;
  email?: string;
  statistics?: {
    routes: number;
    upvotes: number;
    downvotes: number;
    number_of_reviews: number;
  };
  routes?: {
    name: string;
    isPublic: boolean;
  }[];
  achievements?: {
    name: string;
    currentStars: number;
    totalStars: number;
  }[];
}

interface UserContextType {
  userData: UserData | null;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};
