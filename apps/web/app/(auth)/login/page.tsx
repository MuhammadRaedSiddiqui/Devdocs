// Redirect /login to /sign-in (Clerk authentication)
import { redirect } from 'next/navigation';

export default function LoginRedirect() {
  redirect('/sign-in');
}
