"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { 
  ChevronRight, Bike, Car, Clock, Banknote, 
  Plus, X, Loader2, Archive, RotateCcw, Tag
} from "lucide-react"
import { toast } from "sonner"

interface Course {
  id: string;
  name: string;
  type: 'Moto' | 'Auto';
  total_hours: number;
  base_price: number;
  discounted_price: number | null;
  is_active: boolean;
  allow_quick_creation: boolean;
  price_type: 'hour' | 'package';
}

export default function CoursesPage() {
  const t = useTranslations("admin.courses")
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'active' | 'archived'>('active')
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function getCourses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', view === 'active')
      .order('type')
      .order('base_price', { ascending: false })
    
    if (error) toast.error(error.message)
    if (data) setCourses(data)
    setLoading(false)
  }

  useEffect(() => { getCourses() }, [view])

  // --- ACTIONS ---

  const openEdit = (course: Course) => {
    setEditingId(course.id)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  async function toggleStatus(e: React.MouseEvent, id: string, currentStatus: boolean) {
    e.stopPropagation() // Запобігаємо відкриттю модалки при кліку на кнопку
    const actionKey = currentStatus ? "actions.archive" : "actions.restore"
    const confirmMsg = t("notifications.confirm", { 
      action: t(actionKey).toLowerCase() 
    })

    if (!confirm(confirmMsg)) return

    const { error } = await supabase
      .from('courses')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) toast.error(error.message)
    else {
      toast.success(currentStatus ? t("notifications.archived") : t("notifications.restored"))
      getCourses()
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const dPrice = formData.get('discounted_price')

    
    const payload = {
      name: formData.get('name'),
      type: formData.get('type'),
      total_hours: Number(formData.get('hours')),
      base_price: Number(formData.get('price')),
      discounted_price: dPrice === "" ? null : Number(dPrice),
      is_active: true,
      allow_quick_creation: formData.get('allow_quick_creation') === 'on',
      price_type: formData.get('price_type')
    }

    try {
      if (editingId) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('courses').insert([payload])
        if (error) throw error
      }

      toast.success(editingId ? t("notifications.updated") : t("notifications.added"))
      closeModal()
      getCourses()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            {t("title")}
          </h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('active')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'active' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t("tabs.active")}
            </button>
            <button 
              onClick={() => setView('archived')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'archived' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t("tabs.archived")}
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto bg-primary text-black px-6 py-4 md:py-3 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} strokeWidth={3} /> {t("actions.add")}
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] shadow-2xl">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500 hidden md:table-header-group">
                <tr>
                  <th className="p-4 pl-6">{t("table.name")}</th>
                  <th className="p-4">{t("table.type")}</th>
                  <th className="p-4"><div className="flex items-center gap-2"><Clock size={12}/> {t("table.duration")}</div></th>
                  <th className="p-4"><div className="flex items-center gap-2"><Banknote size={12}/> {t("table.basePrice")}</div></th>
                  <th className="p-4 text-primary"><div className="flex items-center gap-2"><Tag size={12}/> {t("table.promo")}</div></th>
                  <th className="p-4 text-right pr-6">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {courses.map((course) => (
                  <tr 
                    key={course.id} 
                    onClick={() => openEdit(course)}
                    className={`group cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors ${!course.is_active && 'opacity-60'}`}
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-10 rounded-full shrink-0 ${course.type === 'Moto' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-base md:text-sm truncate">{course.name}</p>
                          <div className="md:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 uppercase mt-0.5 font-medium">
                            <span>{course.type}</span>
                            <span>•</span>
                            <span>{course.total_hours}h</span>
                            <span>•</span>
                            <span className="text-primary font-bold">
                              {course.discounted_price ? `${course.discounted_price.toLocaleString()} ₴` : `${course.base_price.toLocaleString()} ₴`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      {course.type === 'Moto' ? (
                        <div className="flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase"><Bike size={14} /> Moto</div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase"><Car size={14} /> Auto</div>
                      )}
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-400 font-mono text-sm">{course.total_hours}h</td>
                    <td className="p-4 hidden md:table-cell font-bold text-slate-300">
                      <span className={course.discounted_price ? "line-through opacity-40 text-xs" : "text-sm"}>
                        {course.base_price.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell font-black text-primary text-sm">
                      {course.discounted_price ? (
                        <span>{course.discounted_price.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-700 font-normal italic text-[10px]">{t("table.noDiscount")}</span>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex justify-end items-center gap-2">
                        {course.is_active ? (
                          <button 
                            onClick={(e) => toggleStatus(e, course.id, true)} 
                            className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                          >
                            <Archive size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => toggleStatus(e, course.id, false)} 
                            className="p-2 text-primary hover:scale-110 transition-transform"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <ChevronRight size={18} className="text-slate-800 md:hidden" />
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">
                      {t("table.empty", { view: view === 'active' ? t("tabs.active").toLowerCase() : t("tabs.archived").toLowerCase() })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
          <form 
            onSubmit={handleSave} 
            className="w-full max-w-lg bg-[#0f0f0f] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom md:slide-in-from-right duration-300 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase text-primary tracking-tighter">
                {editingId ? t("modal.edit") : t("modal.create")}
              </h2>
              <button type="button" onClick={closeModal} className="bg-white/5 hover:bg-white/10 p-3 rounded-full transition-colors text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.name")}</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={courses.find(c => c.id === editingId)?.name}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 outline-none focus:border-primary text-white transition-all font-bold" 
                  placeholder="Назва"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.category")}</label>
                  <select 
                    name="type" 
                    defaultValue={courses.find(c => c.id === editingId)?.type || "Moto"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 outline-none text-white appearance-none font-bold"
                  >
                    <option value="Moto" className="bg-[#111]">🏍️ Moto</option>
                    <option value="Auto" className="bg-[#111]">🚗 Auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.hours")}</label>
                  <input 
                    name="hours" 
                    type="number" 
                    required 
                    defaultValue={courses.find(c => c.id === editingId)?.total_hours}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 outline-none focus:border-primary text-white font-bold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.price")}</label>
                  <input 
                    name="price" 
                    type="number" 
                    required 
                    defaultValue={courses.find(c => c.id === editingId)?.base_price}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 outline-none focus:border-primary text-white font-bold" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-primary/70 ml-1">{t("modal.fields.promoPrice")}</label>
                  <input 
                    name="discounted_price" 
                    type="number" 
                    defaultValue={courses.find(c => c.id === editingId)?.discounted_price || ""}
                    className="w-full bg-white/5 border border-primary/20 rounded-2xl p-4 mt-1 outline-none focus:border-primary text-white font-bold" 
                    placeholder={t("modal.fields.optional")}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.priceType")}</label>
                <div className="flex bg-white/5 p-1 rounded-2xl mt-1 border border-white/10">
                  <label className="flex-1">
                    <input 
                      type="radio" name="price_type" value="hour" className="peer hidden" 
                      defaultChecked={courses.find(c => c.id === editingId)?.price_type === 'hour'} 
                    />
                    <div className="text-center py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all peer-checked:bg-white/10 peer-checked:text-primary text-slate-500">
                      {t("modal.fields.perHour")}
                    </div>
                  </label>
                  <label className="flex-1">
                    <input 
                      type="radio" name="price_type" value="package" className="peer hidden" 
                      defaultChecked={courses.find(c => c.id === editingId)?.price_type !== 'hour'} 
                    />
                    <div className="text-center py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all peer-checked:bg-white/10 peer-checked:text-primary text-slate-500">
                      {t("modal.fields.perPackage")}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 px-1 py-2">
                <div className="relative flex items-center h-5">
                  <input
                    id="allow_quick_creation"
                    name="allow_quick_creation"
                    type="checkbox"
                    defaultChecked={courses.find(c => c.id === editingId)?.allow_quick_creation}
                    className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 checked:bg-primary checked:border-transparent transition-all cursor-pointer appearance-none"
                  />
                  <div className="absolute pointer-events-none opacity-0 check-icon text-black left-1">
                    {/* Optional: Add a small checkmark icon here if your CSS supports it, or use standard browser checkbox */}
                  </div>
                </div>
                <label htmlFor="allow_quick_creation" className="text-xs font-bold uppercase text-slate-300 cursor-pointer select-none">
                  {t("modal.fields.allowQuickCreation")}
                </label>
              </div>

              <div className="pt-4 pb-4 pb-safe-bottom-mobile">
                <button 
                  disabled={isSubmitting}
                  className=" w-full bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(255,165,0,0.3)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? t("actions.processing") : t("actions.submit")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )

  // return (
  //   <div className="space-y-8">
  //     {/* HEADER SECTION */}
  //     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
  //       <div>
  //         <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
  //           {t("title")}
  //         </h1>
  //         <div className="flex gap-4 mt-2">
  //           <button 
  //             onClick={() => setView('active')}
  //             className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'active' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
  //           >
  //             {t("tabs.active")}
  //           </button>
  //           <button 
  //             onClick={() => setView('archived')}
  //             className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'archived' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
  //           >
  //             {t("tabs.archived")}
  //           </button>
  //         </div>
  //       </div>
        
  //       <button 
  //         onClick={() => setShowModal(true)}
  //         className="w-full md:w-auto bg-primary text-black px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/10"
  //       >
  //         <Plus size={18} strokeWidth={3} /> {t("actions.add")}
  //       </button>
  //     </div>

  //     {/* TABLE SECTION */}
  //     <div className="overflow-hidden rounded-2xl border border-white/5 bg-card shadow-2xl">
  //       {loading ? (
  //         <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
  //       ) : (
  //         <div className="overflow-x-auto">
  //           <table className="w-full text-left">
  //             <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-400">
  //               <tr>
  //                 <th className="p-4">{t("table.name")}</th>
  //                 <th className="p-4 hidden sm:table-cell">{t("table.type")}</th>
  //                 <th className="p-4 hidden md:table-cell"><div className="flex items-center gap-2"><Clock size={12}/> {t("table.duration")}</div></th>
  //                 <th className="p-4"><div className="flex items-center gap-2"><Banknote size={12}/> {t("table.basePrice")}</div></th>
  //                 <th className="p-4 text-primary"><div className="flex items-center gap-2"><Tag size={12}/> {t("table.promo")}</div></th>
  //                 <th className="p-4 text-right">{t("table.actions")}</th>
  //               </tr>
  //             </thead>
  //             <tbody className="divide-y divide-white/5">
  //               {courses.map((course) => (
  //                 <tr key={course.id} className={`hover:bg-white/[0.02] transition-colors ${!course.is_active && 'opacity-60'}`}>
  //                   <td className="p-4 font-bold text-white max-w-[150px] truncate md:max-w-none">
  //                     {course.name}
  //                     <div className="sm:hidden text-[10px] text-slate-500 uppercase mt-1">
  //                       {course.type} • {course.total_hours}h
  //                     </div>
  //                   </td>
  //                   <td className="p-4 hidden sm:table-cell">
  //                     {course.type === 'Moto' ? (
  //                       <div className="flex items-center gap-2 text-orange-500 text-xs font-bold uppercase"><Bike size={16} /> Moto</div>
  //                     ) : (
  //                       <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase"><Car size={16} /> Auto</div>
  //                     )}
  //                   </td>
  //                   <td className="p-4 hidden md:table-cell text-slate-400 font-mono text-sm">{course.total_hours}h</td>
  //                   <td className="p-4 font-bold text-slate-300">
  //                     <span className={course.discounted_price ? "line-through opacity-40 text-xs" : "text-sm"}>
  //                       {course.base_price.toLocaleString()}
  //                     </span>
  //                   </td>
  //                   <td className="p-4 font-black text-primary text-sm">
  //                     {course.discounted_price ? (
  //                       <span>{course.discounted_price.toLocaleString()}</span>
  //                     ) : (
  //                       <span className="text-slate-700 font-normal italic text-[10px]">{t("table.noDiscount")}</span>
  //                     )}
  //                   </td>
  //                   <td className="p-4 text-right">
  //                     <div className="flex justify-end items-center gap-4 md:gap-8 px-2">
  //                       {course.is_active ? (
  //                         <>
  //                           <button 
  //                             onClick={() => openEdit(course)} 
  //                             className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all"
  //                           >
  //                             <span className="text-[10px] font-black uppercase tracking-tighter hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
  //                               {t("actions.edit")}
  //                             </span>
  //                             <Settings2 size={18} />
  //                           </button>
  //                           <button 
  //                             onClick={() => toggleStatus(course.id, true)} 
  //                             className="group flex items-center gap-2 text-slate-600 hover:text-red-500 transition-all" 
  //                           >
  //                             <span className="text-[10px] font-black uppercase tracking-tighter hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
  //                               {t("actions.archive")}
  //                             </span>
  //                             <Archive size={18} />
  //                           </button>
  //                         </>
  //                       ) : (
  //                         <button 
  //                           onClick={() => toggleStatus(course.id, false)} 
  //                           className="group flex items-center gap-2 text-primary hover:scale-110 transition-all" 
  //                         >
  //                           <span className="text-[10px] font-black uppercase tracking-tighter">
  //                             {t("actions.restore")}
  //                           </span>
  //                           <RotateCcw size={18} />
  //                         </button>
  //                       )}
  //                     </div>
  //                   </td>
  //                 </tr>
  //               ))}
  //               {courses.length === 0 && (
  //                 <tr>
  //                   <td colSpan={6} className="p-20 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">
  //                     {t("table.empty", { view: view === 'active' ? t("tabs.active").toLowerCase() : t("tabs.archived").toLowerCase() })}
  //                   </td>
  //                 </tr>
  //               )}
  //             </tbody>
  //           </table>
  //         </div>
  //       )}
  //     </div>

  //     {/* MODAL */}
  //     {showModal && (
  //       <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm p-4">
  //         <form onSubmit={handleSave} className="w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 animate-in slide-in-from-right duration-300 max-h-[95vh] overflow-y-auto">
  //           <div className="flex justify-between items-center mb-8">
  //             <h2 className="text-2xl font-black italic uppercase text-primary">
  //               {editingId ? t("modal.edit") : t("modal.create")}
  //             </h2>
  //             <button type="button" onClick={closeModal} className="hover:bg-white/5 p-2 rounded-full transition-colors"><X /></button>
  //           </div>
            
  //           <div className="space-y-6">
  //             <div>
  //               <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.name")}</label>
  //               <input 
  //                 name="name" 
  //                 required 
  //                 defaultValue={courses.find(c => c.id === editingId)?.name}
  //                 className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
  //                 placeholder="Назва"
  //               />
  //             </div>

  //             <div className="grid grid-cols-2 gap-4">
  //               <div>
  //                 <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.category")}</label>
  //                 <select 
  //                   name="type" 
  //                   defaultValue={courses.find(c => c.id === editingId)?.type || "Moto"}
  //                   className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none text-white appearance-none"
  //                 >
  //                   <option value="Moto" className="bg-card">🏍️ Moto</option>
  //                   <option value="Auto" className="bg-card">🚗 Auto</option>
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.hours")}</label>
  //                 <input 
  //                   name="hours" 
  //                   type="number" 
  //                   required 
  //                   defaultValue={courses.find(c => c.id === editingId)?.total_hours}
  //                   className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
  //                 />
  //               </div>
  //             </div>

  //             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-6">
  //               <div>
  //                 <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">{t("modal.fields.price")}</label>
  //                 <input 
  //                   name="price" 
  //                   type="number" 
  //                   required 
  //                   defaultValue={courses.find(c => c.id === editingId)?.base_price}
  //                   className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
  //                 />
  //               </div>
  //               <div>
  //                 <label className="text-[10px] font-bold uppercase text-primary/70 ml-1">{t("modal.fields.promoPrice")}</label>
  //                 <input 
  //                   name="discounted_price" 
  //                   type="number" 
  //                   defaultValue={courses.find(c => c.id === editingId)?.discounted_price || ""}
  //                   className="w-full bg-white/5 border border-primary/20 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
  //                   placeholder={t("modal.fields.optional")}
  //                 />
  //               </div>
  //             </div>

  //             <div className="flex gap-3 pt-2 pb-safe-bottom-mobile">
  //               <button 
  //                 disabled={isSubmitting}
  //                 className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(255,165,0,0.3)] transition-all active:scale-95 disabled:opacity-50"
  //               >
  //                 {isSubmitting ? t("actions.processing") : t("actions.submit")}
  //               </button>
  //             </div>
  //           </div>
  //         </form>
  //       </div>
  //     )}
  //   </div>
  // )
}