'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AddExpenseForm() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'overhead' | 'salary_expense'>('overhead');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Expenses are recorded as NEGATIVE numbers in the ledger
    const { error } = await supabase.from('ledger_entries').insert([
      {
        amount: -Math.abs(parseFloat(amount)),
        entry_type: category,
        description: description,
      },
    ]);

    if (!error) {
      toast.success('Expense recorded successfully');
      setAmount('');
      setDescription('');
    } else {
      toast.error('Failed to record expense');
    }
    setLoading(false);
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Record Business Expense 💸</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <Button 
              type="button"
              variant={category === 'overhead' ? 'default' : 'outline'}
              onClick={() => setCategory('overhead')}
              className="flex-1"
            >
              Overhead/Rent
            </Button>
            <Button 
              type="button"
              variant={category === 'salary_expense' ? 'default' : 'outline'}
              onClick={() => setCategory('salary_expense')}
              className="flex-1"
            >
              Instructor Pay
            </Button>
          </div>

          <Input 
            type="number" 
            placeholder="Amount (UAH)" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
          />
          <Input 
            placeholder="What was this for? (e.g. Fuel, Track Rent)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required
          />
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
            {loading ? 'Recording...' : 'Save Expense'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}