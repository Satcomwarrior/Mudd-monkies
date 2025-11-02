'use client';

import { PdfViewer } from '@/components/PdfViewer';
import { Header } from '@/components/Header';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      <PdfViewer />
    </main>
  );
}
