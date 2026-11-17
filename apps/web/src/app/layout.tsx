import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { PRODUCT_NAME } from '@dueday/shared';

export const metadata: Metadata = {
  title: { default: `${PRODUCT_NAME} — student deadline planner`, template: `%s · ${PRODUCT_NAME}` },
  description: 'A calm, private planner for student deadlines, applications, and the next small step.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
