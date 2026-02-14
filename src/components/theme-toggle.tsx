"use client"

import { useState, useEffect } from "react"
import { Paintbrush, Pipette, LayoutGrid, RotateCcw } from "lucide-react"

const templates = [
  { id: 'red', label: 'Ducati Red', primary: 'oklch(0.6 0.2 25)', bg: 'oklch(0.10 0.01 20)' },
  { id: 'orange', label: 'Safety Orange', primary: 'oklch(0.7 0.2 45)', bg: 'oklch(0.12 0.01 285)' },
  { id: 'yellow', label: 'Yellow', primary: 'oklch(0.85 0.189 113.42)', bg: 'oklch(0.10 0.01 20)' },
  { id: 'green', label: 'Kawasaki Green', primary: 'oklch(0.8 0.25 145)', bg: 'oklch(0.10 0.02 150)' },
  { id: 'blue', label: 'Yamaha Blue', primary: 'oklch(0.6 0.2 250)', bg: 'oklch(0.12 0.01 240)' },
]

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState('red')
  //const [customColor, setCustomColor] = useState("#ff8000")
  const [customColor, setCustomColor] = useState("#E06D21")

  useEffect(() => {
    const saved = localStorage.getItem('app-livery')
    const savedCustom = localStorage.getItem('app-custom-color')
    
    if (saved === 'custom' && savedCustom) {
      setActiveId('custom')
      setCustomColor(savedCustom)
    } else if (saved) {
      setActiveId(saved)
    }
  }, [])

  const applyLivery = (theme: typeof templates[0]) => {
    const root = document.documentElement
    root.style.setProperty('--primary', theme.primary)
    root.style.setProperty('--background', theme.bg)
    setActiveId(theme.id)
    localStorage.setItem('app-livery', theme.id)
    localStorage.removeItem('app-custom-color')
  }

  const handleCustomColor = (hex: string) => {
    setCustomColor(hex)
    document.documentElement.style.setProperty('--primary', hex)
    setActiveId('custom')
    localStorage.setItem('app-livery', 'custom')
    localStorage.setItem('app-custom-color', hex)
  }

  const resetTheme = () => {
    const defaultTheme = templates[0]
    applyLivery(defaultTheme)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-2 px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all group"
      >
        <Paintbrush size={14} className="text-primary transition-transform group-hover:rotate-12" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Livery Spec</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-64 bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-5 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <LayoutGrid size={12} />
                  <p className="text-[9px] font-black uppercase tracking-widest">Factory Templates</p>
                </div>
                <button 
                  onClick={resetTheme}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                  title="Reset to Factory"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {templates.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => applyLivery(theme)}
                    className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all text-left ${
                      activeId === theme.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="w-full h-1 rounded-full" style={{ backgroundColor: theme.primary }} />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-white">{theme.label}</span>
                  </button>
                ))}
              </div>

              <div className="h-[1px] bg-white/5 my-2" />

              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Pipette size={12} />
                <p className="text-[9px] font-black uppercase tracking-widest">Custom Spec</p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                <div className="relative w-10 h-10 shrink-0">
                   <input 
                    type="color" 
                    value={customColor}
                    onChange={(e) => handleCustomColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div 
                    className="w-full h-full rounded-lg border border-white/20 shadow-inner" 
                    style={{ backgroundColor: customColor }}
                  />
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase">Primary Hex</span>
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">{customColor}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}