"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Pencil, List } from "lucide-react"

interface DocumentModalProps {
  clientId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const statusTranslations: Record<string, string> = {
  pending_collection: "Очікується",
  submitted: "Подано",
  ready: "Готово",
  completed: "Видано",
}

export function DocumentModal({ clientId, isOpen, onClose, onUpdate }: DocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any | null>(null)
  // Mobile-specific toggle to switch between List and Form
  const [mobileTab, setMobileTab] = useState<'list' | 'form'>('list')

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
      setEditingDoc(null)
      setMobileTab('list')
    }
  }, [isOpen, clientId])

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
    const form = e.currentTarget
    setIsUploading(true)
    const formData = new FormData(form)

    const payload = {
      client_id: clientId,
      title: formData.get('title'),
      status: formData.get('status'),
      url: formData.get('url'),
      submission_date: formData.get('submission_date') || null,
      ready_date_est: formData.get('ready_date_est') || null,
    }

    let error;
    if (editingDoc) {
      const result = await supabase.from('client_documents').update(payload).eq('id', editingDoc.id)
      error = result.error
    } else {
      const result = await supabase.from('client_documents').insert(payload)
      error = result.error
    }

    if (!error) {
      form.reset()
      setEditingDoc(null)
      fetchDocuments()
      onUpdate()
      setMobileTab('list') // Switch back to list after success
    }
    setIsUploading(false)
  }

  async function handleDelete(docId: string) {
    if (!confirm('Ви впевнені, що хочете видалити цей документ?')) return
    const { error } = await supabase.from('client_documents').delete().eq('id', docId)
    if (!error) {
      fetchDocuments()
      onUpdate()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl sm:p-4">
      {/* Container: Full screen on mobile, rounded on desktop */}
      <div className="bg-[#0a0a0a] border-white/10 w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] sm:border relative shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header - Fixed */}
        <div className="p-6 sm:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary hidden sm:block"><FileText size={20}/></div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Документи</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Керування файлами</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full">
            <X size={20}/>
          </button>
        </div>

        {/* Mobile Navigation Tabs - Only visible on small screens */}
        <div className="flex sm:hidden border-b border-white/5 shrink-0">
          <button 
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'list' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
          >
            <List size={14}/> Список
          </button>
          <button 
            onClick={() => setMobileTab('form')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${mobileTab === 'form' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
          >
            <Plus size={14}/> {editingDoc ? 'Редагувати' : 'Додати'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* LIST VIEW */}
            <div className={`space-y-3 ${mobileTab === 'list' ? 'block' : 'hidden sm:block'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase italic px-2 mb-2">Наявні документи:</p>
              {documents.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-20 border border-dashed border-white/10 rounded-3xl">
                  <FileText size={40} />
                  <p className="text-[10px] font-black uppercase mt-2 text-center">Список порожній</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className={`bg-white/5 border ${editingDoc?.id === doc.id ? 'border-primary/50' : 'border-white/5'} p-4 rounded-2xl flex justify-between items-center transition-all`}>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-white uppercase truncate pr-4">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className={`w-1.5 h-1.5 rounded-full ${(doc.status === 'ready' || doc.status === 'completed' ) ? 'bg-green-500' : 'bg-primary'}`} />
                         <p className="text-[9px] font-black text-slate-500 uppercase">
                           {statusTranslations[doc.status] || doc.status}
                         </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => { setEditingDoc(doc); setMobileTab('form'); }}
                        className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-amber-500 sm:hover:text-amber-500 transition-colors"
                      >
                        <Pencil size={14}/>
                      </button>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl text-slate-400 active:text-primary sm:hover:text-primary transition-colors">
                          <ExternalLink size={14}/>
                        </a>
                      )}
                      <button 
                        onClick={() => handleDelete(doc.id)} 
                        className="p-3 bg-red-500/10 rounded-xl text-red-500 active:bg-red-500 active:text-white transition-all"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* FORM VIEW */}
            <div className={`space-y-4 pb-10 sm:pb-0 ${mobileTab === 'form' ? 'block' : 'hidden sm:block'}`}>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-primary uppercase italic">
                  {editingDoc ? "Редагування" : "Новий запис"}
                </span>
                {editingDoc && (
                  <button 
                    onClick={() => { setEditingDoc(null); setMobileTab('list'); }}
                    className="text-[9px] font-black text-slate-500 uppercase"
                  >
                    Скасувати
                  </button>
                )}
              </div>

              <form key={editingDoc?.id || 'new'} onSubmit={handleSubmit} className="space-y-4 bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-white/5">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Назва</label>
                  <input name="title" defaultValue={editingDoc?.title || ''} placeholder="Назва Документа" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Статус</label>
                  <select name="status" defaultValue={editingDoc?.status || 'pending_collection'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none appearance-none">
                    <option value="pending_collection">Очікується</option>
                    <option value="submitted">Подано</option>
                    <option value="ready">Готово</option>
                    <option value="completed">Видано</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Посилання</label>
                  <div className="relative">
                    <LinkIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="url" type="url" defaultValue={editingDoc?.url || ''} placeholder="Google Drive..." className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Подано</label>
                    <input name="submission_date" type="date" defaultValue={editingDoc?.submission_date || ''} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Готовність</label>
                    <input name="ready_date_est" type="date" defaultValue={editingDoc?.ready_date_est || ''} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none" />
                  </div>
                </div>

                <button 
                  disabled={isUploading} 
                  className={`w-full ${editingDoc ? 'bg-amber-500' : 'bg-primary'} text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2`}
                >
                  {isUploading ? "Обробка..." : editingDoc ? "Зберегти" : "Підтвердити"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Safe Area Padding for Mobile Bottom */}
        <div className="h-4 sm:hidden shrink-0 bg-[#0a0a0a]" />
      </div>
    </div>
  )
}