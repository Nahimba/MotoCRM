"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white overflow-x-hidden">
      {/* SIDEBAR: Handles its own fixed positioning.
          - Desktop: w-64 fixed left
          - Mobile: bottom-dock fixed bottom
      */}
      <Sidebar />

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header stays at the top */}
        <Header />

        {/* MAIN:
            1. We use flex-1 to grow.
            2. pb-32 (128px) on mobile creates a "dead zone" at the bottom 
               of the scroll so the last form elements can be seen ABOVE the dock.
            3. Added [env(safe-area-inset-bottom)] for notched iPhones.
        */}
        <main className="flex-1 p-4 md:p-8 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8 transition-all">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}