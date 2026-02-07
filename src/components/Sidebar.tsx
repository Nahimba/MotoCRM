'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserPlus, Receipt, ClipboardList } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Rider', href: '/clients/new', icon: UserPlus },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen p-4 fixed left-0 top-0">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold tracking-tight text-orange-500">RACEWAY CRM</h1>
      </div>
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}