"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Clock, User, Info, Loader2, Search, X, Eye, ArrowRight
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface AuditLog {
  id: string
  created_at: string
  table_name: string
  action: string
  description: string
  user_display_name: string
  old_data: any
  new_data: any
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  async function fetchLogs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) toast.error(error.message)
    if (data) setLogs(data)
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const filteredLogs = logs.filter(log => 
    log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            Журнал <span className="text-primary">аудиту</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">
            Історія всіх фінансових маніпуляцій
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input 
            type="text"
            placeholder="ПОШУК..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:border-primary transition-colors outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] shadow-2xl">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-white/5 text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="p-5 border-b border-white/5"><div className="flex items-center gap-2"><Clock size={12}/> Час</div></th>
                  <th className="p-5 border-b border-white/5"><div className="flex items-center gap-2"><User size={12}/> Користувач</div></th>
                  <th className="p-5 border-b border-white/5">Опис зміни</th>
                  <th className="p-5 border-b border-white/5 text-right w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-primary/[0.03] transition-all cursor-pointer group"
                  >
                    <td className="p-5">
                      <div className="text-[11px] font-bold text-white group-hover:text-primary transition-colors">
                        {format(new Date(log.created_at), 'dd.MM.yyyy')}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-primary border border-white/5 group-hover:border-primary/30 transition-colors">
                          {log.user_display_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight text-zinc-300 group-hover:text-white transition-colors">
                          {log.user_display_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-[13px] text-zinc-400 font-medium leading-relaxed group-hover:text-zinc-200 transition-colors">
                        {log.description}
                      </p>
                    </td>
                    <td className="p-5 text-right">
                      <Eye size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-zinc-600 font-black uppercase text-[10px] tracking-widest italic">
                      Записів не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETAILED VIEW */}
      {selectedLog && (
        <div className="pb-safe-bottom-mobile fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 relative max-h-[90vh] overflow-hidden flex flex-col scale-in-center animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className={`text-[9px] font-black px-3 py-1 rounded-full border mb-3 inline-block uppercase tracking-[0.2em] ${
                  selectedLog.action === 'DELETE' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 
                  selectedLog.action === 'INSERT' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 
                  'text-blue-500 border-blue-500/20 bg-blue-500/5'
                }`}>
                  {selectedLog.action === 'UPDATE' ? 'Оновлення' : selectedLog.action === 'INSERT' ? 'Створення' : 'Видалення'}
                </div>
                <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Деталі транзакції</h2>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
              ><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Виконав</p>
                  <p className="text-sm font-black text-white uppercase italic">{selectedLog.user_display_name}</p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Точний час</p>
                  <p className="text-sm font-black text-white uppercase">
                    {format(new Date(selectedLog.created_at), 'HH:mm:ss (dd.MM)')}
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl shadow-[0_0_40px_rgba(255,165,0,0.03)]">
                <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-2">Суть операції</p>
                <p className="text-white font-bold text-lg leading-tight italic tracking-tight underline decoration-primary/30 underline-offset-4">
                  "{selectedLog.description}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 ml-2">Стан До</p>
                  <pre className="bg-black border border-white/5 p-4 rounded-2xl text-[10px] text-zinc-500 font-mono overflow-x-auto h-48 scrollbar-hide">
                    {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : "// Новий запис"}
                  </pre>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest mb-2 ml-2">Стан Після</p>
                  <pre className="bg-black border border-primary/10 p-4 rounded-2xl text-[10px] text-primary/80 font-mono overflow-x-auto h-48 scrollbar-hide">
                    {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : "// Дані видалено"}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
               <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em]">
                 ID: {selectedLog.id.split('-')[0]}...
               </p>
               <button 
                onClick={() => setSelectedLog(null)}
                className="bg-white text-black px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform"
               >
                 Закрити
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}