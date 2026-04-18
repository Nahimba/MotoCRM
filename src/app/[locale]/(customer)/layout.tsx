"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { usePathname } from "next/navigation"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-black text-white overflow-x-hidden">
      {/* Sidebar handles desktop left-side and mobile bottom-dock via its internal classes */}
      <Sidebar />

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        {/* MAIN:
            - pb-[calc(8rem+env(safe-area-inset-bottom))]: 
              This is the 128px (pb-32) base padding PLUS the iPhone "Home Bar" space.
            - Removed overflow-y-auto to allow the main window to handle scrolling, 
              which prevents "stuck" scrolling issues on mobile Safari/Chrome.
        */}
        <main key={pathname} className="flex-1 p-4 md:p-8 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8 transition-all">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}