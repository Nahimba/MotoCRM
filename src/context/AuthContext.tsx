"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export type Profile = {
  id: string;
  auth_user_id: string;
  //full_name: string;
  middle_name: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'instructor' | 'staff' | 'rider';
  phone?: string;
  avatar_url?: string;
  email?: string;
  address?: string;
  social_link?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Added so ProfilePage can trigger a refresh
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  signOut: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use a Ref to track the current auth ID to prevent race conditions
  const activeAuthId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    activeAuthId.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId) // CRITICAL: Use auth_user_id, not 'id'
        .maybeSingle();

      if (error) throw error;

      // Only update state if this fetch still matches the current logged-in user
      if (activeAuthId.current === userId) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Profile Fetch Error:', err);
    } finally {
      if (activeAuthId.current === userId) {
        setLoading(false);
      }
    }
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const isNewUser = activeAuthId.current !== session.user.id;
        setUser(session.user);
        
        // Refresh profile on sign in or if the user changed
        if (event === 'SIGNED_IN' || isNewUser) {
          await fetchProfile(session.user.id);
        }
      } else {
        // Handle Logout
        activeAuthId.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    sessionStorage.setItem('manualLogout', 'true');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);