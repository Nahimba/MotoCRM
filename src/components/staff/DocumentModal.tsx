"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Pencil } from "lucide-react"

interface DocumentModalProps {
  clientId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

// Словник для перекладу статусів
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

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
      setEditingDoc(null)
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
      const result = await supabase
        .from('client_documents')
        .update(payload)
        .eq('id', editingDoc.id)
      error = result.error
    } else {
      const result = await supabase
        .from('client_documents')
        .insert(payload)
      error = result.error
    }

    if (!error) {
      form.reset()
      setEditingDoc(null)
      fetchDocuments()
      onUpdate()
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-8 my-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
          <X size={24}/>
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary"><FileText size={24}/></div>
          <div>
            <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Документи</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Керування файлами учня</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LIST VIEW */}
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-black text-slate-500 uppercase italic px-2 mb-4">Наявні документи:</p>
            {documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                <FileText size={40} />
                <p className="text-[10px] font-black uppercase mt-2">Список порожній</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className={`bg-white/5 border ${editingDoc?.id === doc.id ? 'border-primary/50' : 'border-white/5'} p-4 rounded-2xl flex justify-between items-center group transition-all`}>
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
                      onClick={() => setEditingDoc(doc)}
                      className="p-2.5 bg-white/5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      title="Редагувати"
                    >
                      <Pencil size={14}/>
                    </button>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 rounded-lg text-slate-400 hover:text-primary transition-colors">
                        <ExternalLink size={14}/>
                      </a>
                    )}
                    <button 
                      onClick={() => handleDelete(doc.id)} 
                      className="p-2.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      title="Видалити"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FORM: ADD OR EDIT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-primary uppercase italic">
                {editingDoc ? "Редагування документа" : "Додати новий документ"}
              </span>
              {editingDoc && (
                <button 
                  onClick={() => setEditingDoc(null)}
                  className="text-[9px] font-black text-slate-500 hover:text-white uppercase transition-colors"
                >
                  Скасувати
                </button>
              )}
            </div>

            <form 
              key={editingDoc?.id || 'new'} 
              onSubmit={handleSubmit} 
              className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5"
            >
              <input 
                name="title" 
                defaultValue={editingDoc?.title || ''}
                placeholder="Назва документа (напр. Мед. довідка)" 
                required 
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" 
              />
              
              <select 
                name="status" 
                defaultValue={editingDoc?.status || 'pending_collection'}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none"
              >
                <option value="pending_collection">Очікується</option>
                <option value="submitted">Подано</option>
                <option value="ready">Готово</option>
                <option value="completed">Видано</option>
              </select>

              <div className="relative">
                <LinkIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  name="url" 
                  type="url" 
                  defaultValue={editingDoc?.url || ''}
                  placeholder="Посилання на файл (Google Drive...)" 
                  className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Дата подачі</label>
                  <input 
                    name="submission_date" 
                    type="date" 
                    defaultValue={editingDoc?.submission_date || ''}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Очікувана готовність</label>
                  <input 
                    name="ready_date_est" 
                    type="date" 
                    defaultValue={editingDoc?.ready_date_est || ''}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" 
                  />
                </div>
              </div>

              <button 
                disabled={isUploading} 
                className={`w-full ${editingDoc ? 'bg-amber-500' : 'bg-primary'} text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2`}
              >
                {isUploading ? "Обробка..." : editingDoc ? "Зберегти зміни" : "Підтвердити"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}