'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dateUtils } from '@/lib/date-utils';
import { 
  Search, Calendar, ExternalLink, User, 
  ChevronRight, AlertCircle, CheckCircle2, Clock, ChevronDown
} from 'lucide-react';
import {DocumentModal} from '@/components/staff/DocumentModal'; // Adjust path if needed

const statusStyles: Record<string, { color: string, icon: any, label: string, weight: number }> = {
  pending_collection: { color: 'text-amber-500', icon: Clock, label: 'Очікую', weight: 1 },
  submitted: { color: 'text-primary', icon: AlertCircle, label: 'Подано на теорію', weight: 2 },
  submitted2: { color: 'text-sky-400', icon: AlertCircle, label: 'Подано на практику', weight: 3 }, // Новий статус
  ready: { color: 'text-green-500', icon: CheckCircle2, label: 'Готово', weight: 4 },
  completed: { color: 'text-slate-500', icon: CheckCircle2, label: 'Видано', weight: 10 }, // Залишаємо для сумісності з БД, якщо статус існує
};

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'today'>('today');
  
  // Collapse State tracking client IDs
  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>({});

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
      .select(`*, clients:client_id (id, profiles:profile_id (first_name, last_name, middle_name, phone))`)
      .order('ready_date_est', { ascending: true });

    // ОНОВЛЕНИЙ ШМАТОК ФУНКЦІЇ ВСЕРЕДИНІ fetchGlobalDocuments():
    if (filter === 'today') {
      query = query
        .lte('ready_date_est', today)
        // Показувати у дедлайнах лише ті документи, які ще НЕ готові й НЕ видані
        .not('status', 'in', '("ready", "completed")'); 
    }

    const { data, error } = await query;
    
    if (!error && data) {
      const sorted = [...data].sort((a, b) => {
        const weightA = statusStyles[a.status]?.weight || 5;
        const weightB = statusStyles[b.status]?.weight || 5;
        if (weightA !== weightB) return weightA - weightB;
        // Безпечне порівняння чистих текстових дат YYYY-MM-DD без таймзон
        return (a.ready_date_est || '').localeCompare(b.ready_date_est || '');
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

  const toggleClientCollapse = (clientId: string) => {
    setCollapsedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const filteredDocs = docs.filter(doc => {
    const name = `${doc.clients?.profiles?.first_name || ''} ${doc.clients?.profiles?.last_name || ''}`.toLowerCase();
    const phone = (doc.clients?.profiles?.phone || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return (
      doc.title?.toLowerCase().includes(search) || 
      name.includes(search) ||
      phone.includes(search)
    );
  });

  // Grouping logic
  const groupedClients: Record<string, { client_id: string; profile: any; documents: any[] }> = {};
  filteredDocs.forEach(doc => {
    const clientId = doc.client_id || 'unknown';
    if (!groupedClients[clientId]) {
      groupedClients[clientId] = {
        client_id: clientId,
        profile: doc.clients?.profiles,
        documents: []
      };
    }
    groupedClients[clientId].documents.push(doc);
  });

  const clientGroups = Object.values(groupedClients);

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
        ) : clientGroups.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] opacity-20">
            <p className="font-black uppercase text-[10px]">Порожньо</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clientGroups.map((group) => {
              const isCollapsed = !!collapsedClients[group.client_id];
              const profile = group.profile;

              return (
                <div key={group.client_id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden">
                  
                  {/* CLIENT GROUP HEADER TOGGLE */}
                  <div 
                    onClick={() => toggleClientCollapse(group.client_id)}
                    className="flex items-center justify-between p-4 sm:p-5 bg-white/[0.02] border-b border-white/5 cursor-pointer select-none active:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={14} className="text-primary shrink-0" />
                      <h2 className="font-black italic uppercase text-sm sm:text-base tracking-tight truncate">
                        {profile ? `${profile.first_name} ${profile.last_name}` : 'Гість'}
                      </h2>
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-black text-slate-400">
                        {group.documents.length}
                      </span>
                    </div>
                    {/* {group.client_id !== 'unknown' && (
                      <Link 
                        href={`/staff/clients/${group.client_id}`} 
                        onClick={(e) => e.stopPropagation()} 
                        className="ml-auto mr-4 text-[10px] font-black uppercase text-slate-500 hover:text-primary transition-all tracking-wider hidden sm:block"
                      >
                        Профіль
                      </Link>
                    )} */}
                    <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                  </div>

                  {/* DOCUMENT LIST SPACE */}
                  <div className={`p-4 sm:p-5 space-y-2 ${isCollapsed ? 'hidden' : 'block'}`}>
                    {group.documents.map((doc) => {
                      const status = statusStyles[doc.status] || statusStyles.pending_collection;
                      const isOverdue = doc.ready_date_est < today && doc.status !== 'completed';
                      const isDone = doc.status === 'completed';

                      return (
                        <div 
                          key={doc.id} 
                          className={`group relative overflow-hidden bg-black/40 border ${isOverdue ? 'border-red-900/30' : 'border-white/5'} ${isDone ? 'opacity-60' : ''} p-4 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="min-w-0">
                              <h3 className="font-black italic uppercase text-xs sm:text-sm truncate pr-4">{doc.title || 'Документ'}</h3>
                              <div className="flex items-center gap-3 mt-1">
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

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DOCUMENT MODAL */}
      {isDocModalOpen && selectedClientId && (
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
          onUpdate={() => {
            fetchGlobalDocuments();
            setIsDocModalOpen(false);
            setSelectedDoc(null);
            setSelectedClientId(null);
          }}
        />
      )}

      {/* DOCUMENT MODAL */}
      {/* {selectedClientId && (
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
      )} */}

    </div>
  );
}

// 'use client';

// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { dateUtils } from '@/lib/date-utils';
// import { 
//   Search, Calendar, ExternalLink, User, 
//   ChevronRight, AlertCircle, CheckCircle2, Clock
// } from 'lucide-react';
// import Link from 'next/link';
// import {DocumentModal} from '@/components/staff/DocumentModal'; // Adjust path if needed

// const statusStyles: Record<string, { color: string, icon: any, label: string, weight: number }> = {
//   pending_collection: { color: 'text-amber-500', icon: Clock, label: 'Очікується', weight: 1 },
//   submitted: { color: 'text-primary', icon: AlertCircle, label: 'Подано', weight: 2 },
//   ready: { color: 'text-green-500', icon: CheckCircle2, label: 'Готово', weight: 3 },
//   completed: { color: 'text-slate-500', icon: CheckCircle2, label: 'Видано', weight: 10 },
//   // not_needed: { color: 'text-slate-600', icon: Clock, label: 'Не потрібно', weight: 11 },
// };

// export default function AdminDocumentsPage() {
//   const [docs, setDocs] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filter, setFilter] = useState<'all' | 'today'>('today');
  
//   // Modal States
//   const [isDocModalOpen, setIsDocModalOpen] = useState(false);
//   const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
//   const [selectedDoc, setSelectedDoc] = useState<any>(null);

//   const today = dateUtils.getKyivToday();

//   useEffect(() => { fetchGlobalDocuments(); }, [filter]);

//   async function fetchGlobalDocuments() {
//     setLoading(true);
//     let query = supabase
//       .from('client_documents')
//       .select(`*, clients:client_id (id, profiles:profile_id (first_name, last_name, middle_name, phone))`)
//       .order('ready_date_est', { ascending: true });

//     if (filter === 'today') {
//       query = query
//         .lte('ready_date_est', today)
//         // .not('status', 'in', '("completed", "not_needed")');
//         .neq('status', 'completed');
//     }

//     const { data, error } = await query;
    
//     if (!error && data) {
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

//   const handleOpenModal = (doc: any) => {
//     setSelectedDoc(doc);
//     setSelectedClientId(doc.client_id);
//     setIsDocModalOpen(true);
//   };

  // const filteredDocs = docs.filter(doc => {
  //   const name = `${doc.clients?.profiles?.first_name || ''} ${doc.clients?.profiles?.last_name || ''}`.toLowerCase();
  //   const search = searchTerm.toLowerCase();
  //   return doc.title?.toLowerCase().includes(search) || name.includes(search);
  // });

// const filteredDocs = docs.filter(doc => {
//   const name = `${doc.clients?.profiles?.first_name || ''} ${doc.clients?.profiles?.last_name || ''}`.toLowerCase();
//   const phone = (doc.clients?.profiles?.phone || '').toLowerCase();
//   const search = searchTerm.toLowerCase();
  
//   return (
//     doc.title?.toLowerCase().includes(search) || 
//     name.includes(search) ||
//     phone.includes(search)
//   );
// });

//   return (
//     <div className="min-h-screen bg-black text-white p-3 sm:p-8 pb-32">
//       <div className="max-w-6xl mx-auto mb-6">
//         <div className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3 mb-1">
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
//             <p className="font-black uppercase text-[10px]">Порожньо</p>
//           </div>
//         ) : (
//           <div className="grid gap-2">
//             {filteredDocs.map((doc) => {
//               const status = statusStyles[doc.status] || statusStyles.pending_collection;
//               //const isOverdue = doc.ready_date_est < today && doc.status !== 'completed' && doc.status !== 'not_needed';
//               //const isDone = doc.status === 'completed' || doc.status === 'not_needed';
//               const isOverdue = doc.ready_date_est < today && doc.status !== 'completed';
//               const isDone = doc.status === 'completed';
//               const profile = doc.clients?.profiles;

//               return (
//                 <div 
//                   key={doc.id} 
//                   className={`group relative overflow-hidden bg-[#0a0a0a] border ${isOverdue ? 'border-red-900/30' : 'border-white/5'} ${isDone ? 'opacity-60' : ''} p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
//                 >
//                   <div className="flex items-center gap-4">
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
//                       {/* Action Button: Opens Modal */}
//                       <button 
//                         onClick={() => handleOpenModal(doc)}
//                         className="p-2.5 bg-white/5 rounded-lg text-slate-500 hover:text-primary transition-all active:scale-90"
//                       >
//                         <ChevronRight size={14} />
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* DOCUMENT MODAL */}
//       {selectedClientId && (
//         <DocumentModal  
//           clientId={selectedClientId}
//           first_name={selectedDoc?.clients?.profiles?.first_name || ""}
//           middle_name={selectedDoc?.clients?.profiles?.middle_name || ""}
//           last_name={selectedDoc?.clients?.profiles?.last_name || ""}
//           doc={selectedDoc}
//           isOpen={isDocModalOpen} 
//           onClose={() => {
//             setIsDocModalOpen(false);
//             setSelectedDoc(null);
//             setSelectedClientId(null);
//           }} 
//           onUpdate={fetchGlobalDocuments}
//         />
//       )}
//     </div>
//   );
// }