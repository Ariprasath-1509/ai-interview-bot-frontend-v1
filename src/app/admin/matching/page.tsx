import { AppShell } from '@/app/components/AppShell';
import AIMatchingClient from './AIMatchingClient';

export default function AIMatchingPage() {
  return (
    <AppShell title="AI Matching">
      <AIMatchingClient />
    </AppShell>
  );
}