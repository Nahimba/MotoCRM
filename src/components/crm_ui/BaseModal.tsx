"use client"

import { useEffect, ReactNode } from "react"
import { X } from "lucide-react"

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function BaseModal({ isOpen, onClose, title, icon, children, footer }: BaseModalProps) {
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
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-2xl bg-[#0D0D0D] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
        
        {/* Header */}
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
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2">
            <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar"
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