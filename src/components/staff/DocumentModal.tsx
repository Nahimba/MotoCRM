"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Plus, Trash2, ExternalLink, FileText, Calendar, Link as LinkIcon } from "lucide-react"

interface DocumentModalProps {
  clientId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function DocumentModal({ clientId, isOpen, onClose, onUpdate }: DocumentModalProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) fetchDocuments()
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
    setIsUploading(true)
    const formData = new FormData(e.currentTarget)
    
    const { error } = await supabase.from('client_documents').insert({
      client_id: clientId,
      title: formData.get('title'),
      status: formData.get('status'),
      url: formData.get('url'),
      submission_date: formData.get('submission_date') || null,
      ready_date_est: formData.get('ready_date_est') || null,
    })

    if (!error) {
      e.currentTarget.reset()
      fetchDocuments()
      onUpdate()
    }
    setIsUploading(false)
  }

  async function handleDelete(docId: string) {
    const { error } = await supabase.from('client_documents').delete().eq('id', docId)
    if (!error) {
      fetchDocuments()
      onUpdate()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 my-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
          <X size={24}/>
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary"><FileText size={24}/></div>
          <div>
            <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Document Vault</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Manage licensing & certificates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ADD NEW FORM */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
            <input name="title" placeholder="Document Title" required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
            
            <select name="status" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-primary outline-none">
              <option value="pending_collection">Pending Collection</option>
              <option value="submitted">Submitted</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>

            <div className="relative">
              <LinkIcon size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="url" type="url" placeholder="Doc Link (Google Drive/S3)" className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:border-primary outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Submitted</label>
                <input name="submission_date" type="date" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Est. Ready</label>
                <input name="ready_date_est" type="date" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white" />
              </div>
            </div>

            <button disabled={isUploading} className="w-full bg-primary text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> {isUploading ? "Syncing..." : "Add to Vault"}
            </button>
          </form>

          {/* LIST VIEW */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                <FileText size={40} />
                <p className="text-[10px] font-black uppercase mt-2">Vault Empty</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-white uppercase truncate pr-4">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'ready' ? 'bg-green-500' : 'bg-primary'}`} />
                       <p className="text-[9px] font-black text-slate-500 uppercase">{doc.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {doc.url && (
                      <a href={doc.url} target="_blank" className="p-2.5 bg-white/5 rounded-lg text-slate-400 hover:text-primary transition-colors">
                        <ExternalLink size={14}/>
                      </a>
                    )}
                    <button onClick={() => handleDelete(doc.id)} className="p-2.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}