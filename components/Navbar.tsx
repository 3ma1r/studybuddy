'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">StudyBuddy</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {user?.displayName || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
