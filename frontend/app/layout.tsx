import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aerostake — Latrics Joint Ownership & Drone Survey Portal',
  description: 'Industrial drone surveying, flight planning, operations, and milestone tracking portal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
