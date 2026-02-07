"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Search, UserPlus, FileCheck, Clock, Edit3 // Added Edit3 icon
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
    <div className="space-y-8">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter">Riders Roster</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
            {processedClients.length} Students in Training
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-primary transition-all"
            />
          </div>
          
          {/* ✅ LINKED TO NEW RIDER PAGE */}
          <Link href="/dashboard/clients/new">
            <button className="bg-primary text-black p-2 px-4 h-full rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 transition-transform whitespace-nowrap">
              <UserPlus size={16} strokeWidth={3} /> New Rider
            </button>
          </Link>
        </div>
      </div>

      {/* CLIENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-primary font-black animate-pulse uppercase tracking-widest">Initializing Fleet...</div>
        ) : (
          processedClients.map(client => (
            <div key={client.id} className="group relative">
               {/* ✅ QUICK EDIT BUTTON */}
              <Link 
                href={`/dashboard/clients/${client.id}/edit`}
                className="absolute top-4 right-12 z-10 p-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-primary hover:border-primary/50 transition-all"
              >
                <Edit3 size={14} />
              </Link>

              <Link 
                href={`/dashboard/clients/${client.id}`}
                className="bg-card border border-white/5 rounded-3xl p-6 hover:border-primary/50 transition-all block overflow-hidden flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight">
                        {client.name} {client.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-white/5 rounded-md tracking-tighter">
                          {client.phone || 'No Phone'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${client.gear_type === 'Auto' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {client.gear_type || 'Manual'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg ${client.debt > 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                        {client.debt > 0 ? `Борг: ${client.debt}` : 'Paid'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5 my-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <FileCheck size={10} /> Documents
                      </p>
                      <p className={`text-xs font-bold ${client.doc_status === 'Submitted' ? 'text-green-400' : 'text-yellow-500'}`}>
                        {client.doc_status || 'Pending'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <Clock size={10} /> Remaining
                      </p>
                      <p className="text-xs font-bold text-white">
                        {client.activePackage?.remaining_hours || 0}h
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {client.tags && client.tags.length > 0 ? (
                      client.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[8px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          {tag}
                      </span>
                      ))
                  ) : (
                      <span className="text-[8px] text-slate-600 italic uppercase">No tags</span>
                  )}
                </div>

                <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              </Link>
            </div>
          ))
        )}
      </div>

      {!loading && processedClients.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <p className="text-slate-500 font-bold uppercase text-xs">Zero students matching your search.</p>
        </div>
      )}
    </div>
  )
}