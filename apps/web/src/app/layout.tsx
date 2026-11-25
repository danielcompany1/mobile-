import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { PRODUCT_NAME } from '@dueday/shared';

// Self-hosted at build time by next/font: the CSS referenced these families but never loaded them.
const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const headingFont = Manrope({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${PRODUCT_NAME}: student deadline planner`, template: `%s · ${PRODUCT_NAME}` },
  description: 'A calm, private planner for student deadlines, applications, and the next small step.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}><body><AuthProvider>{children}</AuthProvider></body></html>;
}
