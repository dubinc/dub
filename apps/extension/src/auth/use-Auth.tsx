import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  name: string;
  email: string;
  image: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  fetchProfileInfo: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  fetchProfileInfo: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const getCookie = (name: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      chrome.cookies.get(
        { url: "https://app.dub.co", name: name },
        (cookie) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(cookie ? cookie.value : null);
          }
        },
      );
    });
  };

  const fetchProfileInfo = async (token: string) => {
    try {
      const response = await fetch("https://app.dub.co/api/user/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile information");
      }
      const data = await response.json();
      setAuthState({
        user: {
          name: data.name,
          image: data.image,
          email: data.email,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      setAuthState({ user: null, loading: false, error: "" });
    }
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const sessionToken = await getCookie(
          "__Secure-next-auth.session-token",
        );
        if (sessionToken) {
          await fetchProfileInfo(sessionToken);
        } else {
          setAuthState({ user: null, loading: false, error: "Not logged in" });
        }
      } catch (error) {
        setAuthState({ user: null, loading: false, error: "" });
      }
    };

    checkLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, fetchProfileInfo }}>
      {children}
    </AuthContext.Provider>
  );
}
