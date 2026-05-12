"use client"

import { useEffect, ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  showCloseButton?: boolean
}

export function BaseModal({ isOpen, onClose, title, icon, children, footer, className, showCloseButton = true }: BaseModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('lock-screen')
    } else {
      document.documentElement.classList.remove('lock-screen')
    }
    return () => document.documentElement.classList.remove('lock-screen')
  }, [isOpen])

  if (!isOpen) return null

  return (
    // Merged className here so z-index overrides work
    <div className={cn(
      "fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200",
      className 
    )}>
      {/* Backdrop - Separate div to ensure clicks on background trigger onClose */}
      <div 
        className="absolute inset-0 bg-[#050505]/70 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative flex flex-col w-full max-w-2xl bg-[#0D0D0D] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-3xl shadow-2xl h-[92dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        
        {/* Mobile Handle Bar */}
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        {(title || icon) && (
          <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#0D0D0D]">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {icon}
                </div>
              )}
              <h3 className="text-sm font-black uppercase italic text-white tracking-widest">
                {title}
              </h3>
            </div>
            {showCloseButton && (
              <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-white transition-all p-2 hover:bg-white/5 rounded-full"
              >
                <X size={20}/>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div 
          className="flex-grow p-6 overflow-y-auto custom-scrollbar"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 p-6 border-t border-white/5 bg-[#0D0D0D] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}