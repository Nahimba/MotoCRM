"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { usePathname } from "next/navigation"

export default function StaffLayout({ children }: { children: ReactNode }) {
  
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-black text-white overflow-x-hidden">
      {/* Universal Sidebar (Desktop Left / Mobile Bottom) */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        {/* STRATEGY: 
            1. We keep pb-32 as the baseline (8rem).
            2. We add env(safe-area-inset-bottom) to handle the gesture bar on modern phones.
            3. Removed overflow-y-auto to prevent "double scrollbars" and allow 
               the mobile browser to hide its own UI bars naturally.
        */}
        <main key={pathname} className="flex-1 p-4 md:p-8 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8 transition-all">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}