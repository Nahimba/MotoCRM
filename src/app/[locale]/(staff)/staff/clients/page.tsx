"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, UserPlus, Edit3, Bike, Wallet, ChevronRight, Phone, Filter, CheckCircle, RefreshCcw
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function ClientsPage() {
  const t = useTranslations("Clients.list")
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  // Тепер це керує саме запитом до бази: true = Active, false = Inactive
  const [showOnlyActive, setShowOnlyActive] = useState(true)

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      // Використовуємо .eq() з поточним станом
      // Важливо: переконайся, що в Supabase колонка is_active має тип BOOLEAN
      const { data, error } = await supabase
        .from('client_roster_summary_view')
        .select('*')
        .eq('is_active', showOnlyActive) 
        .order('name', { ascending: true });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      toast.error(t("sync_error") || "Sync Failed");
    } finally {
      setLoading(false)
    }
  }, [showOnlyActive, t]);

  // Перевантажуємо дані щоразу, коли змінюється стан перемикача
  useEffect(() => {
    loadClients();
  }, [loadClients])

  const filteredClients = clients.filter(c => {
    const fullName = `${c.name || ''} ${c.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || (c.phone && c.phone.includes(search));
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-32">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 py-10">
        <div>
          <h1 className="text-5xl font-black italic uppercase text-white tracking-tighter leading-none">
            {showOnlyActive ? t("title") : "Archive"} 
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${showOnlyActive ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
              {showOnlyActive ? "Active Pilots" : "Inactive Records"}: {filteredClients.length}
            </p>
            <button onClick={loadClients} className="text-slate-600 hover:text-primary transition-colors">
              <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          {/* TOGGLE: ACTIVE vs INACTIVE */}
          <button 
            type="button"
            onClick={() => setShowOnlyActive(!showOnlyActive)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
              showOnlyActive 
                ? 'bg-primary/10 border-primary/50 text-primary' 
                : 'bg-red-500/10 border-red-500/50 text-red-500'
            }`}
          >
            <Filter size={14} />
            {showOnlyActive ? "Switch to Inactive" : "Switch to Active"}
          </button>

          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder={t("search_placeholder")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[11px] font-bold uppercase tracking-widest text-white outline-none focus:border-primary/50 transition-all"
            />
          </div>
          
          <Link href="/staff/clients/new">
            <button className="bg-primary text-black h-full px-6 py-3 rounded-xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:bg-white transition-all active:scale-95">
              <UserPlus size={18} strokeWidth={3} /> {t("recruit_btn")}
            </button>
          </Link>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#070707] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pilot</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Remaining</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Balance</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                   <Bike className="mx-auto animate-bounce text-primary/20 mb-4" size={32} />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">Accessing Database...</span>
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] italic">
                    No {showOnlyActive ? "active" : "inactive"} pilots found
                  </span>
                </td>
              </tr>
            ) : filteredClients.map(client => {
              const hours = Number(client.total_remaining_hours) || 0;
              const debt = Number(client.total_debt) || 0;

              return (
                <tr key={client.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[10px] border ${
                          showOnlyActive 
                            ? 'bg-gradient-to-br from-white/10 to-transparent text-primary border-white/5' 
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                        }`}>
                          {client.name?.[0]}{client.last_name?.[0]}
                        </div>
                        {client.is_graduated && (
                          <div className="absolute -top-1 -right-1 bg-green-500 text-black rounded-full p-0.5 border-2 border-black">
                            <CheckCircle size={10} strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link href={`/staff/clients/${client.id}`} className="block font-black uppercase text-sm italic hover:text-primary transition-colors text-white">
                          {client.name} {client.last_name}
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold">
                           <Phone size={10} /> {client.phone || "---"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black italic ${!showOnlyActive ? 'text-zinc-600' : (hours < 2 ? 'text-red-500 animate-pulse' : 'text-white')}`}>
                        {hours}H
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                      debt > 0 ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-green-500/5 border-green-500/20 text-green-500'
                    }`}>
                      <Wallet size={12} />
                      <span className="text-[11px] font-black uppercase italic">
                        {debt > 0 ? `${Math.round(debt)} ₴` : "CLEARED"}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Link href={`/staff/clients/${client.id}/edit`} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <Edit3 size={16} />
                      </Link>
                      <Link href={`/staff/clients/${client.id}`} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-black transition-all">
                        <ChevronRight size={18} strokeWidth={3} />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}