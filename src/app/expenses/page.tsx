'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LedgerEntry } from '@/types/database'; // Import our blueprint
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AddExpenseForm from '@/components/AddExpenseForm'; // The form we built last step

export default function ExpensesPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    async function fetchExpenses() {
      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        // We only want 'overhead' (Rent/Fuel) or 'salary_expense' (Instructors)
        .in('entry_type', ['overhead', 'salary_expense'])
        .order('created_at', { ascending: false });
      
      if (data) setEntries(data as LedgerEntry[]);
    }
    fetchExpenses();
  }, []);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Business Expenses</h1>
      </div>

      {/* 1. The Input Form */}
      <AddExpenseForm />

      <hr className="border-slate-800" />

      {/* 2. The History List */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground italic">No expenses recorded yet.</p>
        ) : (
          entries.map((item) => (
            <Card key={item.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-200">{item.description}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">
                    {item.entry_type.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-red-400 font-mono font-bold">
                    {item.amount.toLocaleString()} UAH
                  </span>
                  <p className="text-[10px] text-slate-600">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}