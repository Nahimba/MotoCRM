"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, UserPlus, FileCheck, Clock, Edit3, Bike, Wallet
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        accounts (
          id,
          course_packages (id, contract_price, remaining_hours, status),
          payments (amount)
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error("Fetch Error:", error)
      toast.error(error.message)
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  const processedClients = clients.map(client => {
    const account = client.accounts?.[0]; 
    const activePackage = account?.course_packages?.find((p: any) => p.status === 'active');
    const totalPaid = account?.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const contractPrice = activePackage?.contract_price || 0;
    const debt = contractPrice - totalPaid;

    return { ...client, debt, totalPaid, activePackage };
  }).filter(c => {
    const fullName = `${c.name || ''} ${c.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || (c.phone && c.phone.includes(search));
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">
            Riders <span className="text-primary">Roster</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">
            {processedClients.length} Pilot Dossiers Active
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary transition-all"
            />
          </div>
          
          <Link href="/staff/clients/new">
            <button className="bg-primary text-black px-6 h-full rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_20px_rgba(255,165,0,0.2)]">
              <UserPlus size={18} strokeWidth={3} /> Recruit
            </button>
          </Link>
        </div>
      </div>

      {/* CLIENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-primary font-black animate-pulse uppercase tracking-widest text-sm italic">
            Synchronizing Fleet Data...
          </div>
        ) : (
          processedClients.map(client => (
            <div key={client.id} className="group relative">
              {/* EDIT BUTTON */}
              <Link 
                href={`/staff/clients/${client.id}/edit`}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
              >
                <Edit3 size={16} />
              </Link>

              <Link 
                href={`/staff/clients/${client.id}`}
                className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 hover:border-primary/40 transition-all block h-full relative overflow-hidden"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-2 group-hover:text-primary transition-colors">
                        {client.name} <span className="text-primary group-hover:text-white transition-colors">{client.last_name}</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                          {client.phone || 'NO PHONE'}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${client.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 'bg-orange-500/10 text-orange-400 border-orange-500/10'}`}>
                          {client.gear_type || 'Manual'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* STATS ROW */}
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1.5 tracking-widest">
                        <FileCheck size={12} /> Status
                      </p>
                      <p className={`text-xs font-black uppercase ${client.doc_status === 'Submitted' ? 'text-green-400' : 'text-yellow-500'}`}>
                        {client.doc_status || 'Pending'}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] font-black text-slate-600 uppercase flex items-center justify-end gap-1.5 tracking-widest">
                        Remaining <Clock size={12} />
                      </p>
                      <p className="text-xs font-black text-white uppercase italic">
                        {client.activePackage?.remaining_hours || 0} HOURS
                      </p>
                    </div>
                  </div>

                  {/* FOOTER ROW */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-1">
                      {client.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[8px] bg-white/5 text-slate-500 px-2 py-1 rounded-md uppercase font-black border border-white/5">
                          {tag}
                        </span>
                      )) || <span className="text-[8px] text-slate-700 italic font-black uppercase">Standard</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Wallet size={12} className={client.debt > 0 ? "text-red-500" : "text-green-500"} />
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${client.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {client.debt > 0 ? `${client.debt} ₴` : 'SETTLED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VISUAL ACCENT */}
                <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-all duration-500" />
              </Link>
            </div>
          ))
        )}
      </div>

      {!loading && processedClients.length === 0 && (
        <div className="text-center py-24 bg-[#0a0a0a] rounded-[3rem] border-2 border-dashed border-white/5">
          <Bike className="mx-auto text-slate-800 mb-4" size={48} />
          <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-sm italic">Target Not Found in Roster</p>
        </div>
      )}
    </div>
  )
}