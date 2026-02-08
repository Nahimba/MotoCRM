"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function AdminLayout({ children }: { children: ReactNode }) {
  // We remove the isMobileMenuOpen state entirely because the 
  // Sidebar component now handles its own mobile view at the bottom.

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* SIDEBAR: 
         - On Desktop: Stays on the left (lg:ml-64 handles the main content gap)
         - On Mobile: Becomes the Bottom Dock automatically
      */}
      <Sidebar />

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* The Header (displays "Mode: Admin") */}
        <Header />

        {/* MAIN:
           - Added pb-32 so the content doesn't get hidden behind the Bottom Dock on mobile.
        */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 lg:pb-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}