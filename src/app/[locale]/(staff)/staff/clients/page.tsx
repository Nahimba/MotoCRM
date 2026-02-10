"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, UserPlus, FileCheck, Clock, Edit3, Bike, Wallet
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function ClientsPage() {
  const t = useTranslations("Clients.list")
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  async function loadClients() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('client_roster_summary_view')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      toast.error(error.message || "Failed to synchronize fleet data");
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients();
  }, [])

  const filteredClients = clients.filter(c => {
    const fullName = `${c.name || ''} ${c.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || (c.phone && c.phone.includes(search));
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-32">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">
            {t("title")} <span className="text-primary">{t("subtitle")}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">
            {t("active_count", { count: filteredClients.length })}
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder={t("search_placeholder")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary transition-all focus:ring-1 focus:ring-primary/20"
            />
          </div>
          
          <Link href="/staff/clients/new">
            <button className="bg-primary text-black px-6 h-full py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_25px_rgba(255,165,0,0.15)] active:scale-95">
              <UserPlus size={18} strokeWidth={3} /> {t("recruit_btn")}
            </button>
          </Link>
        </div>
      </div>

      {/* CLIENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-32 text-center">
            <div className="inline-block animate-spin mb-4">
              <Bike className="text-primary" size={32} />
            </div>
            <p className="text-primary font-black uppercase tracking-[0.4em] text-xs italic">
              {t("sync_data")}
            </p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="group relative">
              <Link 
                href={`/staff/clients/${client.id}/edit`}
                className="absolute top-5 right-5 z-20 p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 hover:text-primary hover:border-primary/50 transition-all duration-300"
              >
                <Edit3 size={16} />
              </Link>

              <Link 
                href={`/staff/clients/${client.id}`}
                className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 hover:border-primary/40 transition-all duration-500 block h-full relative overflow-hidden group-hover:translate-y-[-4px] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
              >
                <div className="space-y-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-2.5 group-hover:text-primary transition-colors">
                      {client.name} <span className="text-primary group-hover:text-white transition-colors">{client.last_name}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 tracking-wider">
                        {client.phone || t("no_contact")}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border tracking-wider ${client.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 'bg-orange-500/10 text-orange-400 border-orange-500/10'}`}>
                        {client.gear_type || 'Manual'}
                      </span>
                    </div>
                  </div>

                  {/* STATS ROW */}
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1.5 tracking-widest">
                        <FileCheck size={12} className="text-slate-500" /> {t("dossier")}
                      </p>
                      <p className={`text-xs font-black uppercase italic ${client.doc_status === 'Submitted' ? 'text-green-400' : 'text-yellow-500/80'}`}>
                        {client.doc_status || 'Pending'}
                      </p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <p className="text-[9px] font-black text-slate-600 uppercase flex items-center justify-end gap-1.5 tracking-widest">
                        {t("hours_left")} <Clock size={12} className="text-slate-500" />
                      </p>
                      <p className={`text-xs font-black uppercase italic ${Number(client.total_remaining_hours) < 2 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {t("hours", { count: client.total_remaining_hours || 0 })}
                      </p>
                    </div>
                  </div>

                  {/* FOOTER ROW */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-1.5">
                      {client.tags && client.tags.length > 0 ? (
                        client.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[8px] bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase font-black border border-white/5 tracking-tighter">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[8px] text-slate-800 italic font-black uppercase tracking-widest">{t("standard_unit")}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Wallet size={12} className={Number(client.total_debt) > 0 ? "text-red-500" : "text-green-500"} />
                      <span className={`text-[11px] font-black uppercase tracking-tighter ${Number(client.total_debt) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {Number(client.total_debt) > 0 ? `${Math.round(client.total_debt)} ₴` : t("cleared")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BACKGROUND VISUAL ACCENTS */}
                <div className="absolute top-0 right-0 w-[4px] h-full bg-white/5 group-hover:bg-primary transition-all duration-700" />
                <div className="absolute -bottom-10 -right-10 text-white/[0.02] group-hover:text-primary/[0.05] transition-colors duration-700 pointer-events-none">
                   <Bike size={120} strokeWidth={4} />
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* EMPTY STATE */}
      {!loading && filteredClients.length === 0 && (
        <div className="text-center py-32 bg-[#080808] rounded-[3rem] border-2 border-dashed border-white/5">
          <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bike className="text-slate-800" size={40} />
          </div>
          <h3 className="text-white font-black uppercase italic tracking-tighter text-xl mb-2">{t("no_pilots")}</h3>
          <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-[10px]">{t("missing_data")}</p>
        </div>
      )}
    </div>
  )
}