'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  UserPlus, 
  Receipt, 
  Users, 
  BookOpen 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Rider', href: '/clients/new', icon: UserPlus },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Instructors', href: '/dashboard/instructors', icon: Users }, // New
    { name: 'Courses', href: '/dashboard/courses', icon: BookOpen },     // New
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen p-4 fixed left-0 top-0 border-r border-white/5">
      <div className="mb-8 px-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center font-black">R</div>
        <h1 className="text-xl font-bold tracking-tight text-white italic">RACEWAY <span className="text-orange-500">CRM</span></h1>
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all ${
                isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}