"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UserPlus, X, Loader2, Check, Settings, Trash2, RotateCcw, Archive } from "lucide-react"
import { toast } from "sonner"

interface Instructor {
  id: string;
  full_name: string;
  specialization: 'Moto' | 'Auto' | 'Both';
  is_active: boolean;
  course_instructors?: { courses: { id: string; name: string } }[];
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filtering & Edit State
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  async function fetchData() {
    setLoading(true);
    // Fetch instructors based on the current view toggle
    const { data: instData, error: instError } = await supabase
      .from('instructors')
      .select('*, course_instructors(courses(id, name))')
      .eq('is_active', view === 'active')
      .order('full_name');
    
    const { data: courseData } = await supabase.from('courses').select('id, name');

    if (instError) toast.error(instError.message);
    if (instData) setInstructors(instData);
    if (courseData) setAllCourses(courseData);
    setLoading(false);
  }

  // Refetch whenever the view toggle changes
  useEffect(() => { fetchData() }, [view]);

  // --- ACTIONS ---
  
  const openEdit = (inst: Instructor) => {
    setEditingId(inst.id);
    setSelectedCourses(inst.course_instructors?.map(ci => ci.courses.id) || []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setSelectedCourses([]);
  };

  async function toggleStatus(id: string, currentStatus: boolean) {
    const action = currentStatus ? "deactivate" : "restore";
    if (!confirm(`Are you sure you want to ${action} this instructor?`)) return;
    
    const { error } = await supabase
      .from('instructors')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) toast.error(error.message);
    else {
      toast.success(`Instructor ${currentStatus ? 'archived' : 'restored'}`);
      fetchData();
    }
  }

  async function handleSaveInstructor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      full_name: formData.get('name'),
      specialization: formData.get('spec'),
      is_active: true // Always ensure new/edited ones are active
    };

    try {
      let instructorId = editingId;
      if (editingId) {
        await supabase.from('instructors').update(payload).eq('id', editingId);
        await supabase.from('course_instructors').delete().eq('instructor_id', editingId);
      } else {
        const { data, error } = await supabase.from('instructors').insert([payload]).select().single();
        if (error) throw error;
        instructorId = data.id;
      }

      if (selectedCourses.length > 0 && instructorId) {
        const links = selectedCourses.map(cId => ({ instructor_id: instructorId, course_id: cId }));
        await supabase.from('course_instructors').insert(links);
      }

      toast.success(editingId ? "Instructor updated" : "Instructor added");
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 relative">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Commanders</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('active')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'active' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Active Roster
            </button>
            <button 
              onClick={() => setView('archived')}
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${view === 'archived' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Archived
            </button>
          </div>
        </div>
        
        <button onClick={() => setShowModal(true)} className="bg-primary text-black px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:scale-105 transition-all">
          <UserPlus size={18} strokeWidth={3} /> Recruit Instructor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors.map((inst) => (
            <div key={inst.id} className={`bg-card border rounded-2xl group relative transition-all flex flex-col h-full overflow-hidden ${view === 'archived' ? 'border-white/5 opacity-75' : 'border-white/5 hover:border-primary/50'}`}>
              
              {/* EDIT (Only for Active) */}
              {view === 'active' && (
                <button onClick={() => openEdit(inst)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings size={16} />
                </button>
              )}

              <div className="p-6 flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black uppercase text-xl ${view === 'archived' ? 'bg-slate-800 text-slate-500' : 'bg-primary/20 text-primary'}`}>
                    {inst.full_name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{inst.full_name}</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-slate-400 uppercase font-bold tracking-widest">{inst.specialization}</span>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Expertise:</p>
                  <div className="flex flex-wrap gap-2">
                    {inst.course_instructors?.map((ci: any) => (
                      <span key={ci.courses.id} className={`text-[10px] px-2 py-1 rounded-md font-bold border ${view === 'archived' ? 'bg-slate-900 text-slate-600 border-white/5' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        {ci.courses.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] mt-auto">
                {view === 'active' ? (
                  <button onClick={() => toggleStatus(inst.id, true)} className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all">
                    <Archive size={12} /> Archive Instructor
                  </button>
                ) : (
                  <button onClick={() => toggleStatus(inst.id, false)} className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <RotateCcw size={12} /> Restore to Active
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {instructors.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No commanders found in {view} roster</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveInstructor} className="w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl p-8 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8 text-white">
              <h2 className="text-2xl font-black italic uppercase text-primary">{editingId ? 'Edit Commander' : 'New Instructor'}</h2>
              <button type="button" onClick={closeModal} className="hover:bg-white/5 p-2 rounded-full"><X /></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Full Name</label>
                <input name="name" required defaultValue={instructors.find(i => i.id === editingId)?.full_name} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none focus:border-primary text-white" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Specialization</label>
                <select name="spec" defaultValue={instructors.find(i => i.id === editingId)?.specialization || "Moto"} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-1 outline-none text-white">
                  <option value="Moto" className="bg-card">🏍️ Moto</option>
                  <option value="Auto" className="bg-card">🚗 Auto</option>
                  <option value="Both" className="bg-card">🛠️ Both</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 mb-2 block">Assign to Courses</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {allCourses.map(course => (
                    <label key={course.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedCourses.includes(course.id) ? 'bg-primary/10 border-primary/50 text-white' : 'bg-white/5 border-transparent text-slate-400'}`}>
                      <span className="text-xs font-bold uppercase tracking-tight">{course.name}</span>
                      <input type="checkbox" className="hidden" checked={selectedCourses.includes(course.id)} onChange={() => {
                        setSelectedCourses(prev => prev.includes(course.id) ? prev.filter(id => id !== course.id) : [...prev, course.id])
                      }} />
                      {selectedCourses.includes(course.id) && <Check size={14} className="text-primary" />}
                    </label>
                  ))}
                </div>
              </div>

              <button disabled={isSubmitting} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,165,0,0.3)]">
                {isSubmitting ? "Saving..." : "Save Commander"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}