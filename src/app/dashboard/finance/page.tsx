'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Receipt, Zap, Users, Fuel } from 'lucide-react';

// 1. Define the Props interface to fix the TypeScript error
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
      // Expenses are recorded as NEGATIVE numbers in the ledger
      const { error } = await supabase.from('ledger_entries').insert([
        {
          amount: -Math.abs(parseFloat(amount)),
          entry_type: category,
          description: description,
        },
      ]);

      if (error) throw error;

      toast.success('Expense recorded in ledger');
      setAmount('');
      setDescription('');
      
      // 2. Call the callback function to refresh the parent list
      if (onComplete) onComplete();
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* CATEGORY TOGGLE */}
      <div className="flex gap-2 p-1 bg-black rounded-2xl border border-white/5">
        <button
          type="button"
          onClick={() => setCategory('overhead')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            category === 'overhead' ? 'bg-white/10 text-primary' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Fuel size={14} /> Overhead
        </button>
        <button
          type="button"
          onClick={() => setCategory('salary_expense')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            category === 'salary_expense' ? 'bg-white/10 text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users size={14} /> Salary
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <Input 
            type="number" 
            placeholder="0.00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
            className="bg-black border-white/5 h-14 pl-12 text-white font-bold focus:border-red-500/50 transition-all rounded-xl"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">₴</span>
        </div>

        <Input 
          placeholder="Transaction description..." 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          required
          className="bg-black border-white/5 h-14 text-white font-medium focus:border-primary/50 transition-all rounded-xl"
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-14 bg-white text-black hover:bg-red-500 hover:text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[10px]"
      >
        {loading ? (
          <Zap className="animate-spin" size={16} />
        ) : (
          'Commit to Ledger'
        )}
      </Button>
    </form>
  );
}