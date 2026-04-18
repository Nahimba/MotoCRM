"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Settings2, MapPin, Bike, Car, Globe, 
  Plus, X, Loader2, Archive, RotateCcw, Palette, ChevronRight
} from "lucide-react"
import { toast } from "sonner"

interface Location {
  id: string;
  name: string;
  address: string | null;
  type: 'Auto' | 'Moto' | 'General';
  color_code: string;
  is_active: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'active' | 'archived'>('active')
  
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function getLocations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', view === 'active')
      .order('name')
    
    if (error) toast.error(error.message)
    if (data) setLocations(data)
    setLoading(false)
  }

  useEffect(() => { getLocations() }, [view])

  const openEdit = (loc: Location) => {
    setEditingId(loc.id)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  async function toggleStatus(e: React.MouseEvent, id: string, currentStatus: boolean) {
    e.stopPropagation() // Щоб не спрацьовував клік по рядку
    const action = currentStatus ? "архівувати" : "відновити"
    if (!confirm(`Ви впевнені, що хочете ${action} цю локацію?`)) return

    const { error } = await supabase
      .from('locations')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) toast.error(error.message)
    else {
      toast.success(currentStatus ? "Локацію архівовано" : "Локацію відновлено")
      getLocations()
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      name: formData.get('name'),
      address: formData.get('address'),
      type: formData.get('type'),
      color_code: formData.get('color_code'),
      is_active: true
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('locations').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('locations').insert([payload])
        if (error) throw error
      }

      toast.success(editingId ? "Оновлено" : "Додано")
      closeModal()
      getLocations()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            Локації
          </h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('active')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'active' ? 'text-primary' : 'text-slate-500'}`}
            >
              Активні
            </button>
            <button 
              onClick={() => setView('archived')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'archived' ? 'text-primary' : 'text-slate-500'}`}
            >
              Архів
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-primary text-black px-6 py-4 md:py-3 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} strokeWidth={3} /> Додати локацію
        </button>
      </div>

      {/* LIST / TABLE */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0A0A0A] shadow-2xl">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500 hidden md:table-header-group">
                <tr>
                  <th className="p-4 pl-6">Назва</th>
                  <th className="p-4">Тип</th>
                  <th className="p-4">Адреса</th>
                  <th className="p-4">Колір</th>
                  <th className="p-4 text-right pr-6">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {locations.map((loc) => (
                  <tr 
                    key={loc.id} 
                    onClick={() => openEdit(loc)}
                    className={`group cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors ${!loc.is_active && 'opacity-60'}`}
                  >
                    <td className="p-4 md:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: loc.color_code }} />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-base md:text-sm truncate">{loc.name}</p>
                          <p className="text-[11px] text-slate-500 uppercase font-medium md:hidden mt-0.5 truncate">
                            {loc.type} • {loc.address || "Немає адреси"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      {loc.type === 'Moto' && <div className="flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase"><Bike size={14} /> Moto</div>}
                      {loc.type === 'Auto' && <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase"><Car size={14} /> Auto</div>}
                      {loc.type === 'General' && <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase"><Globe size={14} /> General</div>}
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-400 text-sm italic truncate max-w-[200px]">
                      {loc.address || "—"}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: loc.color_code }} />
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex justify-end items-center gap-2">
                        {loc.is_active ? (
                          <button 
                            onClick={(e) => toggleStatus(e, loc.id, true)}
                            className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                          >
                            <Archive size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => toggleStatus(e, loc.id, false)}
                            className="p-2 text-primary"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <ChevronRight size={18} className="text-slate-700 md:hidden" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MOBILE FRIENDLY MODAL */}
      {showModal && (
        <div className="pb-safe-bottom-mobile fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
          <form 
            onSubmit={handleSave} 
            className="w-full max-w-lg bg-[#0F0F0F] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom md:slide-in-from-right duration-300 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase text-primary">
                {editingId ? "Редагувати" : "Створити"}
              </h2>
              <button type="button" onClick={closeModal} className="bg-white/5 p-2 rounded-full"><X /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Назва локації</label>
                <input 
                  name="name" required 
                  defaultValue={locations.find(l => l.id === editingId)?.name}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary text-white" 
                  placeholder="Наприклад: Автодром Чайка"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Адреса</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    name="address" 
                    defaultValue={locations.find(l => l.id === editingId)?.address || ""}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 outline-none focus:border-primary text-white" 
                    placeholder="Вулиця, номер будинку..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Тип навчання</label>
                  <select 
                    name="type" 
                    defaultValue={locations.find(l => l.id === editingId)?.type || "General"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none text-white appearance-none"
                  >
                    <option value="General" className="bg-[#0F0F0F]">🌐 Загальна</option>
                    <option value="Moto" className="bg-[#0F0F0F]">🏍️ Мото</option>
                    <option value="Auto" className="bg-[#0F0F0F]">🚗 Авто</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Колір у графіку</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                    <input 
                      type="color" 
                      name="color_code"
                      defaultValue={locations.find(l => l.id === editingId)?.color_code || "#3b82f6"}
                      className="w-full h-12 bg-transparent border-none outline-none cursor-pointer p-1"
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:bg-white transition-all active:scale-95 disabled:opacity-50 mt-4 shadow-xl shadow-primary/10"
              >
                {isSubmitting ? "Обробка..." : "Зберегти локацію"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}