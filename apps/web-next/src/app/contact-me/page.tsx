import ContactMe from '@/components/kt/ContactMe';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Support | GrindBuddy KT',
  description: 'Reach out to the GrindBuddy Knowledge Transfer support team for assistance with organizational memory management.',
};

export default function ContactMePage() {
  return <ContactMe />;
}
