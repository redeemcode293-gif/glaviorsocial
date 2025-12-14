import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any;
  wallet: any;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setWallet(walletData);

      // If no country detected yet, detect and update
      if (profileData && !profileData.country) {
        detectAndUpdateCountry(userId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const detectAndUpdateCountry = async (userId: string) => {
    try {
      const response = await supabase.functions.invoke('detect-country');
      if (response.data?.country && response.data?.countryCode) {
        await supabase
          .from('profiles')
          .update({
            country: response.data.country,
            country_code: response.data.countryCode
          })
          .eq('user_id', userId);
        
        // Refresh profile after update
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error detecting country:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWallet(null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to defer Supabase calls
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setWallet(null);
      }
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, wallet, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
