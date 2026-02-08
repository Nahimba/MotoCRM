"use client"

import { ReactNode, useState } from "react"
import { Menu, X } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-black text-white overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* --- MOBILE TRIGGER --- */}
      <div className="lg:hidden fixed top-4 right-4 z-[110]">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-3 bg-primary rounded-2xl text-black shadow-xl"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* --- MOBILE NAV OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black animate-in fade-in duration-200">
           <Sidebar />
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header displays Mode: "admin" */}
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}