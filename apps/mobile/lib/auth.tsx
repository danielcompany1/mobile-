import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getOtpRequestFailure, OtpRequestError } from '@dueday/shared';
import { supabase } from './supabase';

interface AuthValue { session: Session | null; loading: boolean; configured: boolean; sendCode(email: string): Promise<void>; verifyCode(email: string, code: string): Promise<void>; signOut(): Promise<void> }
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo<AuthValue>(() => ({
    session, loading, configured: Boolean(supabase),
    async sendCode(email) {
      if (!supabase) throw new Error('Add your Supabase URL and publishable key to apps/mobile/.env.local.');
      try {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
        if (error) throw error;
      } catch (error) {
        const failure = getOtpRequestFailure(error);
        if (__DEV__) console.warn('otp_request_failed', failure.diagnostic);
        throw new OtpRequestError(failure);
      }
    },
    async verifyCode(email, code) {
      if (!supabase) throw new Error('Supabase is not configured yet.');
      try {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
        if (error) throw new Error(error.status ? 'INVALID_OR_EXPIRED_CODE' : 'AUTH_NETWORK_ERROR');
      } catch (error) {
        if (error instanceof Error && (error.message === 'INVALID_OR_EXPIRED_CODE' || error.message === 'AUTH_NETWORK_ERROR')) throw error;
        throw new Error('AUTH_NETWORK_ERROR');
      }
    },
    async signOut() { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw new Error('Could not sign out. Try again.'); } },
  }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
