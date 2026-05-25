"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { X, Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Pencil, List, Loader2, User } from "lucide-react"
import { dateUtils } from '@/lib/date-utils'

interface DocumentModalProps {
  clientId: string
  first_name: string
  middle_name: string
  last_name: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  doc?: any
}

const statusTranslations: Record<string, string> = {
  pending_collection: "Очікую",
  submitted: "Подано",
  ready: "Готово",
  //completed: "Видано",
}

export const CHECKLIST_ITEMS = [
  {
    key: "has_passport_old",
    label: "Фото/копії Паспорту",
    desc: "1, 2 сторінка та прописка",
    group: "passport_old"
  },
  {
    key: "has_tax_code",
    label: "Ідентифікаційний код",
    group: "passport_old"
  },
  {
    key: "has_id_card",
    label: "Фото/копії ID card",
    desc: "фото з обох сторін",
    group: "id_card"
  },
  {
    key: "has_address_extract",
    label: "Витяг з пропискою",
    group: "id_card"
  },
  {
    key: "has_existing_license",
    label: "Права",
    desc: "якщо є",
    group: "common"
  },
  {
    key: "has_medical",
    label: "Мед довідка 083",
    group: "common"
  }
] as const;

type ChecklistState = {
  has_passport_old: boolean | null;
  has_id_card: boolean | null;
  has_tax_code: boolean | null;
  has_address_extract: boolean | null;
  has_existing_license: boolean | null;
  has_medical: boolean | null;
}


function ChecklistRow({ label, desc, value, onChange }: { 
  label: string; 
  desc?: string;
  value: boolean | null; 
  onChange: (status: boolean | null) => void 
}) {
  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-white/5 transition-all">
      {/* Line 1: Label & Description inline */}
      <div className="flex items-baseline flex-wrap gap-1.5 min-w-0">
        <span className="text-xs text-slate-300 font-bold tracking-wide">
          {label}
        </span>
        {desc && (
          <span className="text-[10px] text-slate-500 font-medium shrink-0">
            ({desc})
          </span>
        )}
      </div>
      
      {/* Line 2: Full-Width Button Group Control Wrapper */}
      <div className="flex gap-1 bg-black border border-white/5 p-0.5 rounded-lg w-full">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex-1 px-2 py-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-center ${value === null ? 'bg-amber-500/15 text-amber-400' : 'text-slate-600'}`}
        >
          Очікую
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 px-2 py-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-center ${value === true ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-600'}`}
        >
          Надано
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 px-2 py-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-center ${value === false ? 'bg-zinc-800 text-zinc-400' : 'text-slate-600'}`}
        >
          Не треба
        </button>
      </div>
    </div>
  );
}

export function DocumentModal({ clientId, first_name, middle_name, last_name, isOpen, onClose, onUpdate, doc }: DocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  const [mobileTab, setMobileTab] = useState<'list' | 'form'>('list')

  const [docTitle, setDocTitle] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [passportType, setPassportType] = useState<"old" | "id">("old");
  const [checklist, setChecklist] = useState<ChecklistState>({
    has_passport_old: null,
    has_id_card: null,
    has_tax_code: null,
    has_address_extract: null,
    has_existing_license: null,
    has_medical: null,
  });
  
  // const [docTitle, setDocTitle] = useState(editingDoc?.title || "");
  // // Track the active UI identity route ('old' or 'id')
  // const [passportType, setPassportType] = useState<"old" | "id">(
  //   editingDoc?.has_id_card === true || editingDoc?.has_address_extract === true ? "id" : "old"
  // );
  
  // const [checklist, setChecklist] = useState({
  //   has_passport_old: editingDoc?.has_passport_old ?? null,
  //   has_id_card: editingDoc?.has_id_card ?? null,
  //   has_tax_code: editingDoc?.has_tax_code ?? null,
  //   has_address_extract: editingDoc?.has_address_extract ?? null,
  //   has_existing_license: editingDoc?.has_existing_license ?? null,
  //   has_medical: editingDoc?.has_medical ?? null,
  // });
  

  const studentFullName = useMemo(() => {
    return `${last_name} ${first_name} ${middle_name}`.trim() || "Керування файлами"
  }, [first_name, middle_name, last_name])

  // useEffect(() => {
  //   if (isOpen) {
  //     fetchDocuments()
  //     if (doc) {
  //       setEditingDoc(doc)
  //       setMobileTab('form')
  //     } else {
  //       setEditingDoc(null)
  //       setMobileTab('list')
  //     }
  //   }
  // }, [isOpen, clientId, doc])

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
      const currentDoc = doc || editingDoc;
      
      if (currentDoc) {
        setDocTitle(currentDoc.title || "");
        setBloodType(currentDoc.blood_type || "");
        setPassportType(currentDoc.has_id_card === true || currentDoc.has_address_extract === true ? "id" : "old");
        setChecklist({
          has_passport_old: currentDoc.has_passport_old ?? null,
          has_id_card: currentDoc.has_id_card ?? null,
          has_tax_code: currentDoc.has_tax_code ?? null,
          has_address_extract: currentDoc.has_address_extract ?? null,
          has_existing_license: currentDoc.has_existing_license ?? null,
          has_medical: currentDoc.has_medical ?? null,
        });
        if (doc) setMobileTab('form');
      } else {
        // Reset to initial clean state setup
        setDocTitle("");
        setBloodType("");
        setPassportType("old");
        setChecklist({
          has_passport_old: null,
          has_id_card: null,
          has_tax_code: null,
          has_address_extract: null,
          has_existing_license: null,
          has_medical: null,
        });
        setMobileTab('list');
      }
    }
  }, [isOpen, clientId, doc, editingDoc?.id])

  async function fetchDocuments() {
    const { data } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsUploading(true)
    const formData = new FormData(e.currentTarget)
    
    const rawSubDate = formData.get('submission_date') as string
    const rawReadyDate = formData.get('ready_date_est') as string

    // Directly integrate React state instead of unreliable inner HTML text form interpretations
    const payload = {
      client_id: clientId,
      title: docTitle,
      blood_type: bloodType || null,
      status: formData.get('status'),
      url: formData.get('url') || null,
      submission_date: rawSubDate || null,
      ready_date_est: rawReadyDate || null,
      ...checklist
    }

    let error;
    const activeId = doc?.id || editingDoc?.id;

    if (activeId) {
      const result = await supabase.from('client_documents').update(payload).eq('id', activeId)
      error = result.error
    } else {
      const result = await supabase.from('client_documents').insert(payload)
      error = result.error
    }

    if (!error) {
      setEditingDoc(null)
      fetchDocuments()
      onUpdate()
      
      if (doc) {
        onClose()
      } else {
        setMobileTab('list')
      }
    } else {
      console.error("Помилка збереження документа:", error.message)
    }
    setIsUploading(false)
  }

  async function handleDelete(docId: string) {
    if (!confirm('Ви впевнені, що хочете видалити цей документ?')) return
    const { error } = await supabase.from('client_documents').delete().eq('id', docId)
    if (!error) {
      fetchDocuments()
      onUpdate()
      if (editingDoc?.id === docId) setEditingDoc(null)
    }
  }

  const handleToggle = (key: keyof typeof checklist, status: boolean | null) => {
    setChecklist(prev => ({ ...prev, [key]: status }));
  };
  
  // When the user swaps the top type switch, configure the alternate data rows automatically
  const handleTypeChange = (type: "old" | "id") => {
    setPassportType(type);
    setChecklist(prev => {
      const updated = { ...prev };
      if (type === "old") {
        updated.has_id_card = false;
        updated.has_address_extract = false;
        // Reset passport fields to default evaluation status if they were hard disabled
        if (updated.has_passport_old === false) updated.has_passport_old = null;
        if (updated.has_tax_code === false) updated.has_tax_code = null;
      } else {
        updated.has_passport_old = false;
        updated.has_tax_code = false;
        if (updated.has_id_card === false) updated.has_id_card = null;
        if (updated.has_address_extract === false) updated.has_address_extract = null;
      }
      return updated;
    });
  };


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl sm:p-4 overflow-hidden">
      <div className="bg-[#0a0a0a] border-white/10 w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] sm:border relative shadow-2xl flex flex-col overflow-hidden mx-auto">
        
        {/* Header */}
        <div className="p-6 sm:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary hidden sm:block"><FileText size={20}/></div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tighter leading-none">
                {editingDoc ? "Редагувати" : "Документи"}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <User size={10} className="text-primary"/> {studentFullName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20}/>
          </button>
        </div>

        {/* Mobile Navigation Tabs */}
        {!doc && (
          <div className="flex sm:hidden border-b border-white/5 shrink-0">
            <button 
              onClick={() => setMobileTab('list')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'list' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
            >
              <List size={14}/> Список
            </button>
            <button 
              onClick={() => { setEditingDoc(null); setMobileTab('form'); }}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'form' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
            >
              <Plus size={14}/> {editingDoc ? 'Редагувати' : 'Додати'}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {/* Use grid-cols-1 if doc is present to center the form, else md:grid-cols-2 for side-by-side */}
          <div className={`grid gap-8 ${doc ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>

            {/* LEFT: LIST VIEW */}
            {!doc && (
              <div className={`space-y-3 ${mobileTab === 'list' ? 'block' : 'hidden sm:block'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase italic px-2 mb-2">Наявні документи:</p>
                {documents.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-20 border border-dashed border-white/10 rounded-3xl">
                    <FileText size={40} />
                    <p className="text-[10px] font-black uppercase mt-2 text-center">Список порожній</p>
                  </div>
                ) : (
                  documents.map((d) => (
                    <div key={d.id} className={`bg-white/5 border ${editingDoc?.id === d.id ? 'border-primary/50' : 'border-white/5'} p-4 rounded-2xl flex justify-between items-center transition-all`}>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-white uppercase truncate pr-4">{d.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`w-1.5 h-1.5 rounded-full ${(d.status === 'ready' || d.status === 'completed' ) ? 'bg-green-500' : 'bg-primary'}`} />
                           <p className="text-[9px] font-black text-slate-500 uppercase">
                             {statusTranslations[d.status] || d.status}
                             {d.blood_type && ` • Гр. крові: ${d.blood_type}`}
                           </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => { setEditingDoc(d); setMobileTab('form'); }}
                          className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-amber-500 transition-colors"
                        >
                          <Pencil size={14}/>
                        </button>
                        {d.url && (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-primary transition-colors">
                            <ExternalLink size={14}/>
                          </a>
                        )}
                        <button 
                          onClick={() => handleDelete(d.id)} 
                          className="p-3 bg-red-500/10 rounded-xl text-red-500 active:bg-red-500 transition-all"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* RIGHT: FORM VIEW */}
            <div className={`space-y-4 pb-10 sm:pb-0 ${mobileTab === 'form' ? 'block' : 'hidden sm:block'} ${doc ? 'w-full' : ''}`}>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-primary uppercase italic">
                  {editingDoc ? "Редагування" : "Новий запис"}
                </span>
                {editingDoc && !doc && (
                  <button 
                    onClick={() => { setEditingDoc(null); setMobileTab('list'); }}
                    className="text-[9px] font-black text-slate-500 uppercase"
                  >
                    Скасувати
                  </button>
                )}
              </div>

              <form key={editingDoc?.id || 'new'} onSubmit={handleSubmit} className="space-y-4 bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-white/5">
                {/* <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Назва</label>
                  <input name="title" defaultValue={editingDoc?.title || ''} placeholder="Назва Документа" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
                </div> */}

<div className="space-y-4 max-w-full">
  {/* Package Target Picker */}
  <div className="space-y-1">
    <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-wider">Назва Пакету</label>
    <select 
      name="title" 
      value={docTitle}
      onChange={(e) => setDocTitle(e.target.value)}
      required 
      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none"
    >
      <option value="" disabled hidden>Оберіть Назву Пакету</option>
      <option value="Права А">Права А</option>
      <option value="Права Б">Права Б</option>
    </select>
  </div>

  {/* Checklist Manifest Section */}
  {docTitle && (
    <div className="space-y-4 bg-white/[0.02] p-3 sm:p-4 rounded-2xl border border-white/5">
      
      {/* Mobile-Friendly Custom Segmented Select Box Control */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black text-slate-500 uppercase ml-1 tracking-wider">Тип Посвідчення Особи</label>
        <div className="grid grid-cols-2 gap-1 bg-black p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => handleTypeChange("old")}
            className={`py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${passportType === "old" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
          >
            Паспорт
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("id")}
            className={`py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${passportType === "id" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
          >
            ID Картка
          </button>
        </div>
      </div>

      <div className="pt-2 space-y-3">
        {/* Conditional Group Rendering based on selection */}
        {passportType === "old" ? (
          <div className="space-y-2 anim-fade-in">
            {CHECKLIST_ITEMS.filter(i => i.group === "passport_old").map(item => (
              <ChecklistRow 
                key={item.key} 
                label={item.label} 
                desc={"desc" in item ? item.desc : undefined}
                value={checklist[item.key]} 
                onChange={(status) => handleToggle(item.key, status)} 
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2 anim-fade-in">
            {CHECKLIST_ITEMS.filter(i => i.group === "id_card").map(item => (
              <ChecklistRow 
                key={item.key} 
                label={item.label} 
                desc={"desc" in item ? item.desc : undefined}
                value={checklist[item.key]} 
                onChange={(status) => handleToggle(item.key, status)} 
              />
            ))}
          </div>
        )}

        <hr className="border-white/5 my-1" />

        {/* Shared Prerequisites */}
        <div className="space-y-2">
          {CHECKLIST_ITEMS.filter(i => i.group === "common").map(item => (
            <ChecklistRow 
              key={item.key} 
              label={item.label} 
              desc={"desc" in item ? item.desc : undefined}
              value={checklist[item.key]} 
              onChange={(status) => handleToggle(item.key, status)} 
            />
          ))}
        </div>
      </div>
    </div>
  )}
</div>
                
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Статус</label>
                  <select name="status" defaultValue={editingDoc?.status || 'pending_collection'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none appearance-none">
                    {Object.entries(statusTranslations).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>


                {/* Поле: Група Крові (Необов'язкове) */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-wider">
                    Група крові <span className="text-slate-600 font-medium">(необов'язково)</span>
                  </label>
                  <p className="text-[10px] font-bold text-rose-500/80 leading-relaxed px-2 pt-1 tracking-wide">
                    * Може бути помилковим! Необхідно перевіряти у мед. довідці!
                  </p>
                  <select 
                    value={bloodType} 
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none appearance-none"
                  >
                    <option value="">Не вказано</option>
                    <option value="I(O) Rh+">I(O) Rh+</option>
                    <option value="I(O) Rh-">I(O) Rh-</option>
                    <option value="II(A) Rh+">II(A) Rh+</option>
                    <option value="II(A) Rh-">II(A) Rh-</option>
                    <option value="III(B) Rh+">III(B) Rh+</option>
                    <option value="III(B) Rh-">III(B) Rh-</option>
                    <option value="IV(AB) Rh+">IV(AB) Rh+</option>
                    <option value="IV(AB) Rh-">IV(AB) Rh-</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Посилання</label>
                  <div className="relative">
                    <LinkIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="url" type="url" defaultValue={editingDoc?.url || ''} placeholder="Google Drive URL..." className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Подано</label>
                    <input 
                      name="submission_date" 
                      type="date" 
                      defaultValue={editingDoc?.submission_date || dateUtils.getKyivToday()} 
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-primary [color-scheme:dark]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Готовність</label>
                    <input 
                      name="ready_date_est" 
                      type="date" 
                      defaultValue={editingDoc?.ready_date_est || ''} 
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-primary [color-scheme:dark]" 
                    />
                  </div>
                </div>

                <button 
                  disabled={isUploading} 
                  className={`w-full ${editingDoc ? 'bg-amber-500' : 'bg-primary'} text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2`}
                >
                  {isUploading ? <Loader2 className="animate-spin" size={14}/> : editingDoc ? "Зберегти зміни" : "Додати документ"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="h-4 sm:hidden shrink-0 bg-[#0a0a0a]" />
      </div>
    </div>
  )
}





// "use client"

// import { useState, useEffect } from "react"
// import { supabase } from "@/lib/supabase"
// import { X, Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Pencil, List } from "lucide-react"
// import { dateUtils } from '@/lib/date-utils'

// interface DocumentModalProps {
//   clientId: string
//   isOpen: boolean
//   onClose: () => void
//   onUpdate: () => void
//   doc?: any
// }

// const statusTranslations: Record<string, string> = {
//   pending_collection: "Очікується",
//   submitted: "Подано",
//   ready: "Готово",
//   completed: "Видано",
// }

// export function DocumentModal({ clientId, isOpen, onClose, onUpdate, doc}: DocumentModalProps) {
//   const [documents, setDocuments] = useState<any[]>([])
//   const [isUploading, setIsUploading] = useState(false)
//   const [editingDoc, setEditingDoc] = useState<any | null>(null)
//   // Mobile-specific toggle to switch between List and Form
//   const [mobileTab, setMobileTab] = useState<'list' | 'form'>('list')

//   useEffect(() => {
//     if (isOpen) {
//       fetchDocuments()
//       setEditingDoc(null)
//       setMobileTab('list')
//     }
//   }, [isOpen, clientId])

//   async function fetchDocuments() {
//     const { data } = await supabase
//       .from('client_documents')
//       .select('*')
//       .eq('client_id', clientId)
//       .order('created_at', { ascending: false })
//     if (data) setDocuments(data)
//   }

//   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault()
//     const form = e.currentTarget
//     setIsUploading(true)
//     const formData = new FormData(form)
    
//     const rawSubDate = formData.get('submission_date') as string
//     const rawReadyDate = formData.get('ready_date_est') as string

//     const payload = {
//       client_id: clientId,
//       title: formData.get('title'),
//       status: formData.get('status'),
//       url: formData.get('url'),
//       submission_date: rawSubDate || null,
//       ready_date_est: rawReadyDate || null,
//       // submission_date: formData.get('submission_date') || null,
//       // ready_date_est: formData.get('ready_date_est') || null,
//     }

//     let error;
//     if (editingDoc) {
//       const result = await supabase.from('client_documents').update(payload).eq('id', editingDoc.id)
//       error = result.error
//     } else {
//       const result = await supabase.from('client_documents').insert(payload)
//       error = result.error
//     }

//     if (!error) {
//       form.reset()
//       setEditingDoc(null)
//       fetchDocuments()
//       onUpdate()
//       setMobileTab('list') // Switch back to list after success
//     }
//     setIsUploading(false)
//   }

//   async function handleDelete(docId: string) {
//     if (!confirm('Ви впевнені, що хочете видалити цей документ?')) return
//     const { error } = await supabase.from('client_documents').delete().eq('id', docId)
//     if (!error) {
//       fetchDocuments()
//       onUpdate()
//     }
//   }

//   if (!isOpen) return null

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl sm:p-4">
//       {/* Container: Full screen on mobile, rounded on desktop */}
//       <div className="bg-[#0a0a0a] border-white/10 w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] sm:border relative shadow-2xl flex flex-col overflow-hidden">
        
//         {/* Header - Fixed */}
//         <div className="p-6 sm:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
//           <div className="flex items-center gap-3">
//             <div className="p-3 bg-primary/10 rounded-2xl text-primary hidden sm:block"><FileText size={20}/></div>
//             <div>
//               <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Документи</h3>
//               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Керування файлами</p>
//             </div>
//           </div>
//           <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full">
//             <X size={20}/>
//           </button>
//         </div>

//         {/* Mobile Navigation Tabs - Only visible on small screens */}
//         <div className="flex sm:hidden border-b border-white/5 shrink-0">
//           <button 
//             onClick={() => setMobileTab('list')}
//             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'list' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
//           >
//             <List size={14}/> Список
//           </button>
//           <button 
//             onClick={() => setMobileTab('form')}
//             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'form' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
//           >
//             <Plus size={14}/> {editingDoc ? 'Редагувати' : 'Додати'}
//           </button>
//         </div>

//         {/* Scrollable Content */}
//         <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

//             {/* LIST VIEW */}
//             <div className={`space-y-3 ${mobileTab === 'list' ? 'block' : 'hidden sm:block'}`}>
//               <p className="text-[10px] font-black text-slate-500 uppercase italic px-2 mb-2">Наявні документи:</p>
//               {documents.length === 0 ? (
//                 <div className="py-20 flex flex-col items-center justify-center opacity-20 border border-dashed border-white/10 rounded-3xl">
//                   <FileText size={40} />
//                   <p className="text-[10px] font-black uppercase mt-2 text-center">Список порожній</p>
//                 </div>
//               ) : (
//                 documents.map((doc) => (
//                   <div key={doc.id} className={`bg-white/5 border ${editingDoc?.id === doc.id ? 'border-primary/50' : 'border-white/5'} p-4 rounded-2xl flex justify-between items-center transition-all`}>
//                     <div className="overflow-hidden">
//                       <p className="text-xs font-black text-white uppercase truncate pr-4">{doc.title}</p>
//                       <div className="flex items-center gap-2 mt-1">
//                          <span className={`w-1.5 h-1.5 rounded-full ${(doc.status === 'ready' || doc.status === 'completed' ) ? 'bg-green-500' : 'bg-primary'}`} />
//                          <p className="text-[9px] font-black text-slate-500 uppercase">
//                            {statusTranslations[doc.status] || doc.status}
//                          </p>
//                       </div>
//                     </div>
//                     <div className="flex gap-2 shrink-0">
//                       <button 
//                         onClick={() => { setEditingDoc(doc); setMobileTab('form'); }}
//                         className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-amber-500 sm:hover:text-amber-500 transition-colors"
//                       >
//                         <Pencil size={14}/>
//                       </button>
//                       {doc.url && (
//                         <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-primary sm:hover:text-primary transition-colors">
//                           <ExternalLink size={14}/>
//                         </a>
//                       )}
//                       <button 
//                         onClick={() => handleDelete(doc.id)} 
//                         className="p-3 bg-red-500/10 rounded-xl text-red-500 active:bg-red-500 active:text-white transition-all"
//                       >
//                         <Trash2 size={14}/>
//                       </button>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>

//             {/* FORM VIEW */}
//             <div className={`space-y-4 pb-10 sm:pb-0 ${mobileTab === 'form' ? 'block' : 'hidden sm:block'}`}>
//               <div className="flex items-center justify-between px-2">
//                 <span className="text-[10px] font-black text-primary uppercase italic">
//                   {editingDoc ? "Редагування" : "Новий запис"}
//                 </span>
//                 {editingDoc && (
//                   <button 
//                     onClick={() => { setEditingDoc(null); setMobileTab('list'); }}
//                     className="text-[9px] font-black text-slate-500 uppercase"
//                   >
//                     Скасувати
//                   </button>
//                 )}
//               </div>

//               <form key={editingDoc?.id || 'new'} onSubmit={handleSubmit} className="space-y-4 bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-white/5">
//                 <div className="space-y-1">
//                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Назва</label>
//                   <input name="title" defaultValue={editingDoc?.title || ''} placeholder="Назва Документа" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
//                 </div>
                
//                 <div className="space-y-1">
//                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Статус</label>
//                   <select name="status" defaultValue={editingDoc?.status || 'pending_collection'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none appearance-none">
//                     <option value="pending_collection">Очікується</option>
//                     <option value="submitted">Подано</option>
//                     <option value="ready">Готово</option>
//                     <option value="completed">Видано</option>
//                   </select>
//                 </div>

//                 <div className="space-y-1">
//                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Посилання</label>
//                   <div className="relative">
//                     <LinkIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
//                     <input name="url" type="url" defaultValue={editingDoc?.url || ''} placeholder="Google Drive..." className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
//                   </div>
//                 </div>

//                 {/* <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1">
//                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Подано</label>
//                     <input name="submission_date" type="date" defaultValue={editingDoc?.submission_date || ''} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none" />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Готовність</label>
//                     <input name="ready_date_est" type="date" defaultValue={editingDoc?.ready_date_est || ''} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none" />
//                   </div>
//                 </div> */}
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="space-y-1">
//                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Подано</label>
//                     <input 
//                       name="submission_date" 
//                       type="date" 
//                       // Fallback to Kyiv today for new documents if desired
//                       defaultValue={editingDoc?.submission_date || dateUtils.getKyivToday()} 
//                       className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-primary [color-scheme:dark]" 
//                     />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Готовність</label>
//                     <input 
//                       name="ready_date_est" 
//                       type="date" 
//                       defaultValue={editingDoc?.ready_date_est || ''} 
//                       className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-primary [color-scheme:dark]" 
//                     />
//                   </div>
//                 </div>

//                 <button 
//                   disabled={isUploading} 
//                   className={`w-full ${editingDoc ? 'bg-amber-500' : 'bg-primary'} text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2`}
//                 >
//                   {isUploading ? "Обробка..." : editingDoc ? "Зберегти" : "Підтвердити"}
//                 </button>
//               </form>
//             </div>
//           </div>
//         </div>

//         {/* Safe Area Padding for Mobile Bottom */}
//         <div className="h-4 sm:hidden shrink-0 bg-[#0a0a0a]" />
//       </div>
//     </div>
//   )
// }