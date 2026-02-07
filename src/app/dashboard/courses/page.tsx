"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Settings2, Bike, Car, Clock, Banknote, 
  Plus, X, Loader2, Archive, RotateCcw 
} from "lucide-react"
import { toast } from "sonner"

interface Course {
  id: string;
  name: string;
  type: 'Moto' | 'Auto';
  total_hours: number;
  base_price: number;
  is_active: boolean;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'archived'>('active');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function getCourses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', view === 'active')
      .order('type');
    
    if (error) toast.error(error.message);
    if (data) setCourses(data);
    setLoading(false);
  }

  useEffect(() => { getCourses() }, [view]);

  // --- ACTIONS ---

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  async function toggleStatus(id: string, currentStatus: boolean) {
    const action = currentStatus ? "archive" : "restore";
    if (!confirm(`Are you sure you want to ${action} this course?`)) return;

    const { error } = await supabase
      .from('courses')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) toast.error(error.message);
    else {
      toast.success(`Course ${currentStatus ? 'archived' : 'restored'}`);
      getCourses();
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      name: formData.get('name'),
      type: formData.get('type'),
      total_hours: Number(formData.get('hours')),
      base_price: Number(formData.get('price')),
      is_active: true
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert([payload]);
        if (error) throw error;
      }

      toast.success(editingId ? "Course updated" : "New course added to syllabus");
      closeModal();
      getCourses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">The Syllabus</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('active')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'active' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Active Courses
            </button>
            <button 
              onClick={() => setView('archived')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'archived' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Archived
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-black px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/10"
        >
          <Plus size={18} strokeWidth={3} /> Add Course
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-card shadow-2xl">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-400">
              <tr>
                <th className="p-4">Course Name</th>
                <th className="p-4">Type</th>
                <th className="p-4"><div className="flex items-center gap-2"><Clock size={12}/> Duration</div></th>
                <th className="p-4"><div className="flex items-center gap-2"><Banknote size={12}/> Base Price</div></th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {courses.map((course) => (
                <tr key={course.id} className={`hover:bg-white/[0.02] transition-colors ${!course.is_active && 'opacity-60'}`}>
                  <td className="p-4 font-bold text-white">{course.name}</td>
                  <td className="p-4">
                    {course.type === 'Moto' ? (
                      <div className="flex items-center gap-2 text-orange-500 text-xs font-bold uppercase"><Bike size={16} /> Moto</div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase"><Car size={16} /> Auto</div>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-sm">{course.total_hours}h</td>
                  <td className="p-4 font-black text-white">
                    {course.base_price.toLocaleString()} <span className="text-[10px] text-slate-500">UAH</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-8 px-2"> {/* Increased gap to 8 (32px) */}
                      
                      {course.is_active ? (
                        <>
                          {/* EDIT: Neutral and calm */}
                          <button 
                            onClick={() => openEdit(course)} 
                            className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all"
                          >
                            <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                            <Settings2 size={18} />
                          </button>

                          {/* ARCHIVE: Pushed away and dangerous */}
                          <button 
                            onClick={() => toggleStatus(course.id, true)} 
                            className="group flex items-center gap-2 text-slate-600 hover:text-red-500 transition-all" 
                            title="Archive Course"
                          >
                            <span className="text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Archive</span>
                            <Archive size={18} />
                          </button>
                        </>
                      ) : (
                        /* RESTORE: Singular focus for archived items */
                        <button 
                          onClick={() => toggleStatus(course.id, false)} 
                          className="group flex items-center gap-2 text-primary hover:scale-110 transition-all" 
                          title="Restore Course"
                        >
                          <span className="text-[10px] font-black uppercase tracking-tighter">Restore to Active</span>
                          <RotateCcw size={18} />
                        </button>
                      )}
                      
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">
                    No {view} courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSave} className="w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl p-8 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase text-primary">
                {editingId ? 'Edit Course' : 'Create Course'}
              </h2>
              <button type="button" onClick={closeModal} className="hover:bg-white/5 p-2 rounded-full transition-colors"><X /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Course Name</label>
                <input 
                  name="name" 
                  required 
                  defaultValue={courses.find(c => c.id === editingId)?.name}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
                  placeholder="e.g. Pro Rider A2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Category</label>
                  <select 
                    name="type" 
                    defaultValue={courses.find(c => c.id === editingId)?.type || "Moto"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none text-white appearance-none"
                  >
                    <option value="Moto" className="bg-card">🏍️ Moto</option>
                    <option value="Auto" className="bg-card">🚗 Auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Total Hours</label>
                  <input 
                    name="hours" 
                    type="number" 
                    required 
                    defaultValue={courses.find(c => c.id === editingId)?.total_hours}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Base Price (UAH)</label>
                <input 
                  name="price" 
                  type="number" 
                  required 
                  defaultValue={courses.find(c => c.id === editingId)?.base_price}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" 
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(255,165,0,0.3)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Deploy to Syllabus"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}