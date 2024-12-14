import React, { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User, getIdToken } from "firebase/auth";
import { auth, provider } from "@/firebase/config";

interface AuthContextType {
  user: User | null;
  googleSignIn: () => Promise<void>;
  googleSignOut: () => Promise<void>;
  sendUserDataToBackend: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem("currentUser");
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
        setUser(currentUser);
      } else {
        sessionStorage.removeItem("currentUser");
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const googleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      sessionStorage.setItem("currentUser", JSON.stringify(user));
      setUser(user);
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  const googleSignOut = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem("currentUser");
      setUser(null);
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  const sendUserDataToBackend = async (userData: any) => {
    try {
      if (!user) throw new Error("User not authenticated");

      // Retrieve the ID token
      const authToken = await getIdToken(user);

      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`, // Send token in the Authorization header
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Backend Error:", error);
        throw new Error("Failed to send user data to backend");
      }

      console.log("Response from backend:", await response.json());
    } catch (error) {
      console.error("Error sending data to backend:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, googleSignIn, googleSignOut, sendUserDataToBackend }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
