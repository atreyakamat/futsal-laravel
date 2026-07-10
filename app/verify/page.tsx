import { redirect } from 'next/navigation';

export default async function VerifyRedirect({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const resolvedParams = await searchParams;
  const ticket = resolvedParams.ticket;
  if (ticket) {
    redirect(`/verify-ticket?ticket=${ticket}`);
  }
  redirect('/verify-ticket');
}
