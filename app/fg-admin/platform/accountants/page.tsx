import { redirect } from 'next/navigation';

// Superseded by the consolidated Team Management page, which creates and
// edits Accountants alongside every other staff role in one place. Kept as
// a redirect rather than deleted so any bookmarked/linked URL still lands
// somewhere useful.
export default function AccountantsPage() {
  redirect('/fg-admin/platform/users');
}
