'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dateUtils } from '@/lib/date-utils';
import { 
  Search, Calendar, ExternalLink, User, 
  ChevronRight, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import Link from 'next/link';
import {DocumentModal} from '@/components/staff/DocumentModal'; // Adjust path if needed

const statusStyles: Record<string, { color: string, icon: any, label: string, weight: number }> = {
  pending_collection: { color: 'text-amber-500', icon: Clock, label: 'Очікується', weight: 1 },
  submitted: { color: 'text-primary', icon: AlertCircle, label: 'Подано', weight: 2 },
  ready: { color: 'text-green-500', icon: CheckCircle2, label: 'Готово', weight: 3 },
  completed: { color: 'text-slate-500', icon: CheckCircle2, label: 'Видано', weight: 10 },
  // not_needed: { color: 'text-slate-600', icon: Clock, label: 'Не потрібно', weight: 11 },
};

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'today'>('today');
  
  // Modal States
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const today = dateUtils.getKyivToday();

  useEffect(() => { fetchGlobalDocuments(); }, [filter]);

  async function fetchGlobalDocuments() {
    setLoading(true);
    let query = supabase
      .from('client_documents')
      .select(`*, clients:client_id (id, profiles:profile_id (first_name, last_name, middle_name))`)
      .order('ready_date_est', { ascending: true });

    if (filter === 'today') {
      query = query
        .lte('ready_date_est', today)
        // .not('status', 'in', '("completed", "not_needed")');
        .neq('status', 'completed');
    }

    const { data, error } = await query;
    
    if (!error && data) {
      const sorted = [...data].sort((a, b) => {
        const weightA = statusStyles[a.status]?.weight || 5;
        const weightB = statusStyles[b.status]?.weight || 5;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(a.ready_date_est).getTime() - new Date(b.ready_date_est).getTime();
      });
      setDocs(sorted);
    }
    setLoading(false);
  }

  const handleOpenModal = (doc: any) => {
    setSelectedDoc(doc);
    setSelectedClientId(doc.client_id);
    setIsDocModalOpen(true);
  };

  const filteredDocs = docs.filter(doc => {
    const name = `${doc.clients?.profiles?.first_name || ''} ${doc.clients?.profiles?.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return doc.title?.toLowerCase().includes(search) || name.includes(search);
  });

  return (
    <div className="min-h-screen bg-black text-white p-3 sm:p-8 pb-32">
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Реєстр <span className="text-primary">Документів</span></h1>
            </div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
              {filter === 'today' ? `Актуально (${dateUtils.toDisplay(today, 'dd.MM')})` : 'Всі записи'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
            {['today', 'all'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-primary text-black' : 'text-slate-400'}`}
              >
                {f === 'today' ? 'Дедлайни' : 'Всі'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text"
            placeholder="Пошук..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-primary/50 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-600 uppercase font-black text-[10px] tracking-widest">Завантаження...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] opacity-20">
            <p className="font-black uppercase text-[10px]">Порожньо</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filteredDocs.map((doc) => {
              const status = statusStyles[doc.status] || statusStyles.pending_collection;
              //const isOverdue = doc.ready_date_est < today && doc.status !== 'completed' && doc.status !== 'not_needed';
              //const isDone = doc.status === 'completed' || doc.status === 'not_needed';
              const isOverdue = doc.ready_date_est < today && doc.status !== 'completed';
              const isDone = doc.status === 'completed';
              const profile = doc.clients?.profiles;

              return (
                <div 
                  key={doc.id} 
                  className={`group relative overflow-hidden bg-[#0a0a0a] border ${isOverdue ? 'border-red-900/30' : 'border-white/5'} ${isDone ? 'opacity-60' : ''} p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-0">
                      <h3 className="font-black italic uppercase text-sm truncate pr-4">{doc.title || 'Документ'}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <Link href={`/staff/clients/${doc.client_id}`} className="flex items-center gap-1.2 text-[10px] font-bold text-slate-400 hover:text-primary whitespace-nowrap">
                          <User size={10} /> {profile ? `${profile.first_name} ${profile.last_name}` : 'Гість'}
                        </Link>
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-500/80' : 'text-slate-500'}`}>
                          <Calendar size={10} /> {doc.ready_date_est ? dateUtils.toDisplay(doc.ready_date_est, 'dd.MM.yy') : '--.--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-none border-white/5 pt-3 sm:pt-0">
                    <div className={`flex items-center gap-1.5 ${status.color}`}>
                      <status.icon size={12} />
                      <span className="text-[9px] font-black uppercase tracking-wider">{status.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {/* Action Button: Opens Modal */}
                      <button 
                        onClick={() => handleOpenModal(doc)}
                        className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-primary transition-all active:scale-90"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DOCUMENT MODAL */}
      {selectedClientId && (
        <DocumentModal  
          clientId={selectedClientId}
          first_name={selectedDoc?.clients?.profiles?.first_name || ""}
          middle_name={selectedDoc?.clients?.profiles?.middle_name || ""}
          last_name={selectedDoc?.clients?.profiles?.last_name || ""}
          doc={selectedDoc}
          isOpen={isDocModalOpen} 
          onClose={() => {
            setIsDocModalOpen(false);
            setSelectedDoc(null);
            setSelectedClientId(null);
          }} 
          onUpdate={fetchGlobalDocuments}
        />
      )}
    </div>
  );
}



// 'use client';

// import React, { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { dateUtils } from '@/lib/date-utils';
// import { 
//   Search, Calendar, ExternalLink, User, 
//   ChevronRight, AlertCircle, CheckCircle2, Clock
// } from 'lucide-react';
// import Link from 'next/link';

// const statusStyles: Record<string, { color: string, icon: any, label: string, weight: number }> = {
//   pending_collection: { color: 'text-amber-500', icon: Clock, label: 'Очікується', weight: 1 },
//   submitted: { color: 'text-primary', icon: AlertCircle, label: 'Подано', weight: 2 },
//   ready: { color: 'text-green-500', icon: CheckCircle2, label: 'Готово', weight: 3 },
//   completed: { color: 'text-slate-500', icon: CheckCircle2, label: 'Видано', weight: 10 },
//   not_needed: { color: 'text-slate-600', icon: Clock, label: 'Не потрібно', weight: 11 },
// };

// export default function AdminDocumentsPage() {
//   const [docs, setDocs] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filter, setFilter] = useState<'all' | 'today'>('today');
//   const today = dateUtils.getKyivToday();

//   useEffect(() => { fetchGlobalDocuments(); }, [filter]);

//   async function fetchGlobalDocuments() {
//     setLoading(true);
//     let query = supabase
//       .from('client_documents')
//       .select(`*, clients:client_id (id, profiles:profile_id (first_name, last_name))`)
//       .order('ready_date_est', { ascending: true });

//     if (filter === 'today') {
//       query = query
//         .lte('ready_date_est', today)
//         .not('status', 'in', '("completed","not_needed")');
//     }

//     const { data, error } = await query;
    
//     if (!error && data) {
//       // Sort: Priority by status weight (Completed at the end), then by date
//       const sorted = [...data].sort((a, b) => {
//         const weightA = statusStyles[a.status]?.weight || 5;
//         const weightB = statusStyles[b.status]?.weight || 5;
//         if (weightA !== weightB) return weightA - weightB;
//         return new Date(a.ready_date_est).getTime() - new Date(b.ready_date_est).getTime();
//       });
//       setDocs(sorted);
//     }
//     setLoading(false);
//   }

//   const filteredDocs = docs.filter(doc => {
//     const name = `${doc.clients?.profiles?.first_name || ''} ${doc.clients?.profiles?.last_name || ''}`.toLowerCase();
//     const search = searchTerm.toLowerCase();
//     return doc.title?.toLowerCase().includes(search) || name.includes(search);
//   });
  

//   return (
//     <div className="min-h-screen bg-black text-white p-3 sm:p-8 pb-32">
//       <div className="max-w-6xl mx-auto mb-6">
//         <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3 mb-1">
//               {/* <div className="p-2 bg-primary/10 rounded-lg text-primary"><Dock size={20} /></div> */}
//               <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Реєстр <span className="text-primary">Документів</span></h1>
//             </div>
//             <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
//               {filter === 'today' ? `Актуально (${dateUtils.toDisplay(today, 'dd.MM')})` : 'Всі записи'}
//             </p>
//           </div>

//           <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-auto">
//             {['today', 'all'].map((f) => (
//               <button 
//                 key={f}
//                 onClick={() => setFilter(f as any)}
//                 className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-primary text-black' : 'text-slate-400'}`}
//               >
//                 {f === 'today' ? 'Дедлайни' : 'Всі'}
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="mt-6 relative">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
//           <input 
//             type="text"
//             placeholder="Пошук..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-primary/50 outline-none transition-all placeholder:text-slate-600"
//           />
//         </div>
//       </div>

//       <div className="max-w-6xl mx-auto">
//         {loading ? (
//           <div className="py-20 text-center animate-pulse text-slate-600 uppercase font-black text-[10px] tracking-widest">Завантаження...</div>
//         ) : filteredDocs.length === 0 ? (
//           <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] opacity-20">
//             {/* <Dock size={40} className="mx-auto mb-3" /> */}
//             <p className="font-black uppercase text-[10px]">Порожньо</p>
//           </div>
//         ) : (
//           <div className="grid gap-2">
//             {filteredDocs.map((doc) => {
//               const status = statusStyles[doc.status] || statusStyles.pending_collection;
//               const isOverdue = doc.ready_date_est < today && doc.status !== 'completed' && doc.status !== 'not_needed';
//               const isDone = doc.status === 'completed' || doc.status === 'not_needed';
//               const profile = doc.clients?.profiles;

//               return (
//                 <div 
//                   key={doc.id} 
//                   className={`group relative overflow-hidden bg-[#0a0a0a] border ${isOverdue ? 'border-red-900/30' : 'border-white/5'} ${isDone ? 'opacity-60' : ''} p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
//                 >
//                   <div className="flex items-center gap-4">
//                     {/* <div className={`shrink-0 p-3 rounded-xl ${isOverdue ? 'bg-red-500/10 text-red-500' : isDone ? 'bg-white/5 text-slate-600' : 'bg-primary/10 text-primary'}`}>
//                       <Dock size={18} />
//                     </div> */}
//                     <div className="min-w-0">
//                       <h3 className="font-black italic uppercase text-sm truncate pr-4">{doc.title || 'Документ'}</h3>
//                       <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
//                         <Link href={`/staff/clients/${doc.client_id}`} className="flex items-center gap-1.2 text-[10px] font-bold text-slate-400 hover:text-primary whitespace-nowrap">
//                           <User size={10} /> {profile ? `${profile.first_name} ${profile.last_name}` : 'Гість'}
//                         </Link>
//                         <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-500/80' : 'text-slate-500'}`}>
//                           <Calendar size={10} /> {doc.ready_date_est ? dateUtils.toDisplay(doc.ready_date_est, 'dd.MM.yy') : '--.--'}
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-none border-white/5 pt-3 sm:pt-0">
//                     <div className={`flex items-center gap-1.5 ${status.color}`}>
//                       <status.icon size={12} />
//                       <span className="text-[9px] font-black uppercase tracking-wider">{status.label}</span>
//                     </div>
                    
//                     <div className="flex items-center gap-1.5">
//                       {doc.url && (
//                         <a href={doc.url} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
//                           <ExternalLink size={14} />
//                         </a>
//                       )}
//                       <Link href={`/staff/clients/${doc.client_id}?tab=documents`} className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-primary transition-all">
//                         <ChevronRight size={14} />
//                       </Link>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }