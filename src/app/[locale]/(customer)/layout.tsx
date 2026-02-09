"use client"

import { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  // We remove the state and the button logic entirely.
  // Sidebar now manages its own mobile bottom dock.

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar is now universal:
         - lg:block hidden logic is removed here because Sidebar 
           has its own responsive hidden/flex classes inside.
      */}
      <Sidebar />

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        {/* Added pb-32 to ensure page content isn't 
           blocked by the bottom dock on mobile devices.
        */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 lg:pb-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}