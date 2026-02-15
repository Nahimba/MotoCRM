"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Plus, Edit2, ArrowUpRight, ArrowDownLeft, Zap, Calendar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import ExpenseModal from '@/components/admin/finances/ExpenseModal';

type BusinessType = 'All' | 'Auto' | 'Moto' | 'General';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  label: string;
  bizType: BusinessType;
  payment_method?: string;
  description?: string;
}

export default function AdminFinances() {
  // Инициализация переводов
  const t = useTranslations('admin.finances');
  const catT = useTranslations('admin.finances.categories');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BusinessType>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null);
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: payments } = await supabase
      .from('payment_ledger_view')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    const { data: expenses } = await supabase
      .from('business_expenses')
      .select('*')
      .gte('expense_date', dateRange.start)
      .lte('expense_date', dateRange.end);

    const combined: Transaction[] = [
      ...(payments?.map(p => ({
        id: p.payment_id,
        date: p.created_at,
        amount: Number(p.amount),
        type: 'income' as const,
        category: 'income_category', // Ключ для перевода "Обучение"
        label: `${p.client_name} ${p.client_last_name}`,
        bizType: (p.course_type || 'General') as BusinessType
      })) || []),
      ...(expenses?.map(e => ({
        id: e.id,
        date: e.expense_date,
        amount: Number(e.amount),
        type: 'expense' as const,
        category: e.category,
        label: e.description || e.category,
        bizType: (e.type || 'General') as BusinessType,
        payment_method: e.payment_method,
        description: e.description
      })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(combined);
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    return activeTab === 'All' ? transactions : transactions.filter(t => t.bizType === activeTab);
  }, [transactions, activeTab]);

  const stats = useMemo(() => {
    const income = filteredData.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredData.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const groups: Record<string, { date: string, income: number, expense: number }> = {};
    filteredData.forEach(t => {
      const d = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[d]) groups[d] = { date: d, income: 0, expense: 0 };
      if (t.type === 'income') groups[d].income += t.amount;
      else groups[d].expense += t.amount;
    });
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const openNewExpense = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const openEditExpense = (t: Transaction) => {
    setSelectedExpense(t);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-[0.3em] text-[10px] font-bold">
              <Zap className="w-3 h-3 fill-current" /> {t('system_label')}
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">{t('title')}</h1>
          </div>

          <div className="flex flex-wrap gap-3">
             <div className="flex bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl">
               {(['All', 'Moto', 'Auto', 'General'] as BusinessType[]).map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                     activeTab === tab ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                   }`}
                 >
                   {tab === 'All' ? t('tabs.all') : tab}
                 </button>
               ))}
             </div>
             <button 
               onClick={openNewExpense}
               className="bg-white text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase hover:invert transition-all active:scale-95 flex items-center gap-2"
             >
               <Plus className="w-3 h-3 stroke-[4px]" /> {t('add_expense')}
             </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label={t('stats.income')} value={stats.income} color="text-white" sub={t('stats.income_sub')} />
          <StatCard label={t('stats.expenses')} value={stats.expense} color="text-zinc-500" sub={t('stats.expenses_sub')} />
          <StatCard 
            label={t('stats.net_profit')} 
            value={stats.profit} 
            color={stats.profit >= 0 ? "text-green-400" : "text-red-500"} 
            sub={t('stats.net_profit_sub')}
            isHighlight
          />
        </div>

        {/* CHART */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('chart_title')}</h3>
            <div className="flex gap-4 items-center">
               <Calendar className="w-3 h-3 text-zinc-700" />
               <input 
                type="date" value={dateRange.start}
                onChange={e => setDateRange(p => ({...p, start: e.target.value}))}
                className="bg-transparent text-[10px] font-mono font-bold text-zinc-400 outline-none border-b border-zinc-800 pb-1"
               />
               <input 
                type="date" value={dateRange.end}
                onChange={e => setDateRange(p => ({...p, end: e.target.value}))}
                className="bg-transparent text-[10px] font-mono font-bold text-zinc-400 outline-none border-b border-zinc-800 pb-1"
               />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis 
                  dataKey="date" stroke="#3f3f46" fontSize={9} fontWeight="800"
                  tickFormatter={(d) => format(new Date(d), 'dd.MM')}
                />
                <YAxis stroke="#3f3f46" fontSize={9} tickFormatter={(v) => `${v.toLocaleString()}`} />
                <Tooltip 
                  cursor={{fill: '#18181b'}}
                  contentStyle={{backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px'}}
                />
                <Bar name={t('stats.income')} dataKey="income" fill="#ffffff" radius={[2, 2, 0, 0]} barSize={12} />
                <Bar name={t('stats.expenses')} dataKey="expense" fill="#3f3f46" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase font-black text-zinc-600 border-b border-zinc-800/50">
                <th className="px-6 py-4">{t('table.status')}</th>
                <th className="px-6 py-4">{t('table.details')}</th>
                <th className="px-6 py-4">{t('table.type')}</th>
                <th className="px-6 py-4">{t('table.method')}</th>
                <th className="px-6 py-4 text-right">{t('table.amount')}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filteredData.map((t) => (
                <tr key={t.id} className="group hover:bg-zinc-800/20 transition-all">
                  <td className="px-6 py-4">
                    {t.type === 'income' ? 
                      <ArrowUpRight className="w-4 h-4 text-white" /> : 
                      <ArrowDownLeft className="w-4 h-4 text-zinc-700" />
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-black uppercase tracking-tight">{t.label}</div>
                    <div className="text-[10px] text-zinc-600 uppercase mt-0.5">
                      {catT(t.category)} — {format(new Date(t.date), 'dd MMM yyyy', { locale: dateLocale })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                      t.bizType === 'Moto' ? 'border-orange-500/50 text-orange-500' : 
                      t.bizType === 'Auto' ? 'border-blue-500/50 text-blue-500' : 
                      'border-zinc-700 text-zinc-500'
                    }`}>
                      {t.bizType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">{t.payment_method || '—'}</span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${t.type === 'income' ? 'text-white' : 'text-zinc-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₴
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.type === 'expense' && (
                      <button 
                        onClick={() => openEditExpense(t)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-800 rounded-lg transition-all text-zinc-500 hover:text-white"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr> 
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        editData={selectedExpense}
      />
    </div>
  );
}

function StatCard({ label, value, color, sub, isHighlight = false }: { label: string, value: number, color: string, sub: string, isHighlight?: boolean }) {
  return (
    <div className={`p-8 rounded-[32px] border transition-all ${isHighlight ? 'bg-zinc-100 border-white' : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'}`}>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isHighlight ? 'text-zinc-500' : 'text-zinc-600'}`}>{label}</span>
      <div className={`text-4xl font-mono font-black tracking-tighter my-2 ${isHighlight ? 'text-black' : color}`}>
        {value.toLocaleString()}
        <span className="text-sm ml-1 opacity-50 italic text-[10px]">₴</span>
      </div>
      <p className={`text-[9px] font-bold uppercase tracking-widest ${isHighlight ? 'text-zinc-400' : 'text-zinc-700'}`}>{sub}</p>
    </div>
  );
}