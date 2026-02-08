"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Universal Sidebar (Desktop Left / Mobile Bottom) */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        {/* pb-32 is MANDATORY to prevent content hiding behind the dock */}
        <main className="flex-1 overflow-y-auto pb-32 lg:pb-8">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}