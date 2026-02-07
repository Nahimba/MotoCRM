'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Zap, Plus } from 'lucide-react';

interface AddExpenseFormProps {
  onComplete?: () => void;
}

export default function AddExpenseForm({ onComplete }: AddExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'overhead' | 'salary_expense'>('overhead');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('ledger_entries').insert([
        {
          amount: -Math.abs(parseFloat(amount)),
          entry_type: category,
          description: description,
        },
      ]);

      if (error) throw error;

      toast.success('Entry Saved');
      setAmount('');
      setDescription('');
      if (onComplete) onComplete();
      
    } catch (err: any) {
      toast.error('Entry Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* We add max-w-sm to prevent the form from stretching across the whole screen */
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto md:mx-0">
      
      {/* COMPACT CATEGORY PICKER */}
      <div className="flex gap-2">
        {(['overhead', 'salary_expense'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setCategory(type)}
            className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${
              category === type 
                ? 'bg-white/10 border-white/20 text-white' 
                : 'bg-transparent border-transparent text-slate-600 hover:text-slate-400'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {/* AMOUNT INPUT */}
        <div className="relative group">
          <Input 
            type="number" 
            placeholder="0.00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
            className="bg-black/50 border-white/5 h-9 text-sm font-bold focus:border-primary/50 rounded-lg pl-7 transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black italic">₴</span>
        </div>

        {/* DESCRIPTION INPUT */}
        <Input 
          placeholder="Memo..." 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          required
          className="bg-black/50 border-white/5 h-9 text-xs focus:border-primary/50 rounded-lg transition-all"
        />
      </div>

      {/* THE COMPACT BUTTON */}
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-9 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black font-black uppercase text-[9px] tracking-[0.2em] rounded-lg transition-all active:scale-95"
      >
        {loading ? (
          <Zap className="animate-spin" size={14} />
        ) : (
          <span className="flex items-center gap-2">
            <Plus size={12} strokeWidth={3} /> Commit Entry
          </span>
        )}
      </Button>
    </form>
  );
}