"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white overflow-x-hidden">
      {/* Universal Sidebar: Desktop Left / Mobile Bottom Dock */}
      <Sidebar />

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header displays the current section title */}
        <Header />

        {/* MAIN CONTAINER:
            1. lg:ml-64 matches the desktop sidebar width.
            2. pb-[calc(8rem+env(safe-area-inset-bottom))] ensures 
               bottom buttons are visible above the mobile dock.
        */}
        <main className="flex-1 p-4 md:p-8 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-8 transition-all">
          <div className="max-w-4xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}