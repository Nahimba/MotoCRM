"use client"
import { useAuth } from '@/context/AuthContext'

export default function ProfileEditor() {
  const { profile } = useAuth();
  
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Identity Management</h2>
        <p className="text-slate-500 text-sm">Update your pilot credentials and public persona.</p>
      </div>
      
      <div className="space-y-4 bg-[#111] p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black text-2xl font-black">
            {profile?.full_name?.charAt(0)}
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all">
            Upload New Avatar
          </button>
        </div>
        
        {/* Form Fields... */}
      </div>
    </div>
  )
}