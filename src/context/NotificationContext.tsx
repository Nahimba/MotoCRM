'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

import { dateUtils } from '@/lib/date-utils';

interface NotificationContextType {
  unreadCount: number;
  markAsSeen: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NotificationProvider = ({ 
  children, 
  userId, 
  userRole 
}: { 
  children: React.ReactNode; 
  userId: string; 
  userRole: string; 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayIds, setTodayIds] = useState<string[]>([]);

  const refreshData = useCallback(async () => {

    const today = dateUtils.getKyivToday();
    
    let query = supabase
      .from('client_documents')
      .select('id')
      .or(`submission_date.eq.${today},ready_date_est.eq.${today}`);

    // If instructor, only notify for their specific documents
    if (userRole === 'instructor') {
      query = query.eq('instructor_id', userId);
    }

    const { data, error } = await query;

    if (!error && data) {
      const ids = data.map(d => d.id);
      setTodayIds(ids);

      const seenIds: string[] = JSON.parse(localStorage.getItem('seen_doc_ids') || '[]');
      const newDocs = ids.filter(id => !seenIds.includes(id));
      setUnreadCount(newDocs.length);
    }
  }, [userId, userRole]);

  const markAsSeen = useCallback(() => {
    const seenIds: string[] = JSON.parse(localStorage.getItem('seen_doc_ids') || '[]');
    const updated = Array.from(new Set([...seenIds, ...todayIds])).slice(-200);
    localStorage.setItem('seen_doc_ids', JSON.stringify(updated));
    setUnreadCount(0);
  }, [todayIds]);

  useEffect(() => {
    refreshData();

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'client_documents' }, 
        () => refreshData()
      )
      .subscribe();

    const interval = setInterval(refreshData, 3600000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId, refreshData]);

  return (
    <NotificationContext.Provider value={{ unreadCount, markAsSeen }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const NotificationProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  // Wait for Auth + Profile to finish loading before deciding to mount
  if (loading) return <>{children}</>;

  // Use the 'role' from the fetched profile, not metadata
  const role = profile?.role;
  // ✅ Change: Only 'admin' is allowed to mount the provider
  const isEligible = role === 'admin';
  //const isEligible = role === 'admin' || role === 'instructor' || role === 'staff';

  if (!user || !isEligible) {
    return <>{children}</>;
  }

  return (
    <NotificationProvider userId={user.id} userRole={role}>
      {children}
    </NotificationProvider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) return { unreadCount: 0, markAsSeen: () => {} };
  return context;
};