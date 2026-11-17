import Link from 'next/link';
import { SignInForm } from '@/components/SignInForm';
import { PRODUCT_NAME } from '@dueday/shared';
export default function SignInPage() {
  return <main className="authPage"><Link className="brandLockup authBrand" href="/"><span className="brandMark">✓</span><span>{PRODUCT_NAME}</span></Link><SignInForm /><div className="authFooter"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></main>;
}
