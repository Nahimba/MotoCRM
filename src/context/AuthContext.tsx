"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export type Profile = {
  id: string;
  full_name: string;
  role: 'admin' | 'instructor' | 'staff' | 'rider';
  phone?: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  signOut: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const lastFetchedId = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (lastFetchedId.current === userId) return;
    lastFetchedId.current = userId;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('CRITICAL: Profile Fetch Error:', error.message);
        return;
      }

      setProfile(data || { id: userId, full_name: 'New User', role: 'rider' });
    } catch (err) {
      console.error('Unexpected Profile Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial Load Check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchProfile(user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        lastFetchedId.current = null;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // CIRCUIT BREAKER: Tell the Landing Page NOT to auto-login
      sessionStorage.setItem('manualLogout', 'true');
      
      await supabase.auth.signOut();
      
      setUser(null);
      setProfile(null);
      
      // Force refresh to clear all internal state and hit the LandingPage logic
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);