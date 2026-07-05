import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RescueIntel | Predictive Emergency Response',
  description: 'AI-powered data intelligence tool for dispatch optimization.',
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
