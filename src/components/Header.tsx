import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold text-gray-800">PDF Takeoff Tool</h1>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
