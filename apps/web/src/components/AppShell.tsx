'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWebAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PRODUCT_NAME } from '@dueday/shared';

const nav = [{ href: '/app', label: 'Today', icon: '◷' }, { href: '/app/planner', label: 'Planner', icon: '▦' }, { href: '/app/applications', label: 'Applications', icon: '↗' }, { href: '/app/settings', label: 'Settings', icon: '⚙' }];
export function AppShell({ children }: React.PropsWithChildren) {
  const { session, loading } = useWebAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (!loading && !session) router.replace('/sign-in'); }, [loading, session, router]);
  if (loading || !session) return <div className="loadingScreen"><span className="spinner" />Loading your planner…</div>;
  return <div className="workspace"><aside className="sidebar"><Link className="brandLockup" href="/app"><span className="brandMark">✓</span><span>{PRODUCT_NAME}<small>STUDENT PLANNER</small></span></Link><nav className="navList">{nav.map((item) => <Link key={item.href} href={item.href} className={`navItem ${pathname === item.href ? 'active' : ''}`}><span>{item.icon}</span>{item.label}</Link>)}</nav><div className="sidebarBottom"><div className="avatar">{session.user.email?.slice(0, 1).toUpperCase()}</div><div className="accountLabel"><b>Your account</b><span>{session.user.email}</span></div><button className="iconButton" aria-label="Sign out" onClick={async () => { await supabase?.auth.signOut(); router.replace('/sign-in'); }}>↗</button></div></aside><main className="workspaceMain"><div className="mobileBrand"><Link className="brandLockup" href="/app"><span className="brandMark">✓</span><span>{PRODUCT_NAME}</span></Link><Link href="/app/settings" className="avatar">{session.user.email?.slice(0, 1).toUpperCase()}</Link></div>{children}</main><nav className="mobileNav">{nav.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}><span>{item.icon}</span>{item.label}</Link>)}</nav></div>;
}
