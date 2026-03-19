import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Tables<'profiles'> | null;
  wallet: Tables<'wallets'> | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [wallet, setWallet] = useState<Tables<'wallets'> | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const ensureWalletExists = async (userId: string) => {
    const { data: walletData, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && walletData) {
      setWallet(walletData);
      return walletData;
    }

    const { data: createdWallet, error: insertError } = await supabase
      .from('wallets')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating wallet:', insertError);
      setWallet(walletData ?? null);
      return walletData ?? null;
    }

    setWallet(createdWallet);
    return createdWallet;
  };

  const detectAndUpdateCountry = async (userId: string) => {
    try {
      const response = await supabase.functions.invoke('detect-country');
      if (response.data?.country && response.data?.countryCode) {
        await supabase
          .from('profiles')
          .update({
            country: response.data.country,
            country_code: response.data.countryCode,
          })
          .eq('user_id', userId);

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

  const fetchUserData = async (userId: string) => {
    try {
      const [{ data: profileData }, walletData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        ensureWalletExists(userId),
      ]);

      setProfile(profileData);
      setWallet(walletData);

      if (profileData && !profileData.country_code) {
        void detectAndUpdateCountry(userId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const cleanupRealtimeSubscription = async () => {
    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  };

  const setupRealtimeSubscription = async (userId: string) => {
    await cleanupRealtimeSubscription();

    const channel = supabase
      .channel(`auth-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setWallet(null);
            void ensureWalletExists(userId);
            return;
          }

          setWallet(payload.new as Parameters<typeof setWallet>[0]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType !== 'DELETE') {
            setProfile(payload.new);
          }
        },
      );

    realtimeChannelRef.current = channel;
    await channel.subscribe();
  };

  const signOut = async () => {
    await cleanupRealtimeSubscription();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWallet(null);
  };

  useEffect(() => {
    const handleSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void fetchUserData(nextSession.user.id);
        void setupRealtimeSubscription(nextSession.user.id);
      } else {
        void cleanupRealtimeSubscription();
        setProfile(null);
        setWallet(null);
      }

      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      handleSession(nextSession);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      handleSession(existingSession);
    });

    return () => {
      subscription.unsubscribe();
      void cleanupRealtimeSubscription();
    };
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
