import { redirect } from 'next/navigation';

export default function AdminSetupPage() {
  // Redirect to new interview creation page
  redirect('/admin/interviews/create');
}
