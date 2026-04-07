"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Plus, Calendar,
  ChevronDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import ExpenseModal from '@/components/admin/finances/ExpenseModal';


//type BusinessType = 'All' | 'Auto' | 'Moto' | 'General';
import { BUSINESS_TYPES, BusinessType } from '@/constants/constants'; // Adjust path accordingly

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
  instructor_id?: string;
}

export default function AdminFinances() {
  const t = useTranslations('admin.finances');
  const tc = useTranslations('Constants');

  const locale = useLocale();
  const dateLocale = locale === 'ua' ? uk : enUS;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BusinessType | 'All'>('All');
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Transaction | null>(null);
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // 1. Get User Session and Role on Mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUser({ id: session.user.id, role: profile?.role || 'instructor' });
      }
    };
    getUser();
  }, []);

  // 2. Fetch data once user and dateRange are ready
  useEffect(() => {
    if (user) fetchData();
  }, [dateRange, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Base queries
    let paymentsQuery = supabase
      .from('payment_ledger_view')
      .select('*')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    let expensesQuery = supabase
      .from('business_expenses')
      .select('*')
      .gte('expense_date', dateRange.start)
      .lte('expense_date', dateRange.end);

    // Filter by instructor_id if not admin
    if (user.role !== 'admin') {
      paymentsQuery = paymentsQuery.eq('instructor_id', user.id);
      expensesQuery = expensesQuery.eq('created_by_profile_id', user.id); // Updated
    }

    const [{ data: payments }, { data: expenses }] = await Promise.all([
      paymentsQuery,
      expensesQuery
    ]);

    const combined: Transaction[] = [
      ...(payments?.map(p => ({
        id: p.payment_id,
        date: p.created_at,
        amount: Number(p.amount),
        type: 'income' as const,
        category: 'income_category',
        label: `${p.client_name} ${p.client_last_name}`,
        bizType: (p.course_type || 'General') as BusinessType,
        //payment_method: p.method_localization_key,
        payment_method: p.method_slug,
        instructor_id: p.instructor_id
      })) || []),
      ...(expenses?.map(e => ({
        id: e.id,
        date: e.expense_date,
        amount: Number(e.amount),
        type: 'expense' as const,
        category: e.category,
        label: e.description || e.category,
        bizType: (e.type || 'General') as BusinessType,
        //payment_method: 'payment.method.' + e.payment_method,
        payment_method: e.payment_method,
        description: e.description,
        // 2. Correct the mapping to use created_by_profile_id
        instructor_id: e.created_by_profile_id
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

  // const handleRowClick = (transaction: Transaction) => {
  //   if (transaction.type === 'expense') {
  //     setSelectedExpense(transaction);
  //     setIsModalOpen(true);
  //   }
  // };

  const handleRowClick = (transaction: Transaction) => {
    if (transaction.type === 'expense') {
      // 3. Only open the modal if the user is an admin OR they own the record
      const isOwner = transaction.instructor_id === user?.id;
      const isAdmin = user?.role === 'admin';
  
      //if (isAdmin || isOwner) {
      if (isOwner) {
        setSelectedExpense(transaction);
        setIsModalOpen(true);
      } else {
        // Optional: Show a "Read Only" alert or just do nothing
        console.log("Access denied: You can only edit your own expenses.");
      }
    }
  };

  
  const handleMonthChange = (month: number, year: number) => {
    const date = new Date(year, month);
    setDateRange({
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd')
    });
  };
  
  // Current selection state derived from dateRange.start
  const currentMonth = new Date(dateRange.start).getMonth();
  const currentYear = new Date(dateRange.start).getFullYear();
  

  if (loading && !transactions.length) return <div className="p-8 text-zinc-500 font-mono text-xs uppercase animate-pulse">Loading Finances...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          {/* COMPACT HEADER: TITLE LEFT, PICKER RIGHT */}
          <div className="space-y-2 w-full lg:w-auto">
            <div className="flex items-center justify-between lg:justify-start gap-4">
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                {t('title')}
              </h1>

              {/* MONTH SELECTOR */}
              <div className="relative group">
                <select
                  value={`${currentMonth}-${currentYear}`}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split('-').map(Number);
                    handleMonthChange(m, y); // Much cleaner call
                  }}
                  className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-white outline-none pr-7"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return (
                      <option key={i} value={`${d.getMonth()}-${d.getFullYear()}`} className="bg-black">
                        {format(d, 'MMMM yyyy', { locale: dateLocale })}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl">
              {/* Add 'All' manually, then map through the constant */}
              <button
                onClick={() => setActiveTab('All')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                  activeTab === 'All' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('tabs.all')}
              </button>

              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    activeTab === type ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                {/* Access the specific translation key dynamically */}
                {t(`tabs.types.${type}`)}
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

        {/* ADMIN ONLY: STATS & CHART */}
        {user?.role === 'admin' && (
          <>
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

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('chart_title')}</h3>
                <div className="flex gap-2 items-center opacity-40 hover:opacity-100 transition-opacity">
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={e => setDateRange(p => ({...p, start: e.target.value}))}
                    className="bg-transparent text-[9px] font-mono font-bold text-zinc-500 outline-none [color-scheme:dark]"
                  />
                  <span className="text-zinc-800 text-[9px]">—</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={e => setDateRange(p => ({...p, end: e.target.value}))}
                    className="bg-transparent text-[9px] font-mono font-bold text-zinc-500 outline-none [color-scheme:dark]"
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
          </>
        )}

        {/* TABLE */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] uppercase font-black text-zinc-600 border-b border-zinc-800/50">
                <th className="px-4 py-4">{t('table.details')}</th>
                <th className="px-2 py-4">{t('table.method')}</th>
                <th className="px-6 py-4 text-right">{t('table.amount')} ₴</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/10">
              {filteredData.map((transaction, index) => {
                const showSeparator = index === 0 || !isSameDay(new Date(transaction.date), new Date(filteredData[index - 1].date));

                return (
                  <Fragment key={transaction.id}>
                    {showSeparator && (
                      <tr className="bg-zinc-900/20">
                        <td colSpan={3} className="px-8 py-3">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 whitespace-nowrap">
                              {format(new Date(transaction.date), 'dd MMMM yyyy', { locale: dateLocale })}
                            </span>
                            <div className="h-[1px] w-full bg-zinc-800/30" />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr 
                      onClick={() => handleRowClick(transaction)}
                      className={`group transition-all border-none ${
                        transaction.type === 'expense'
                          ? 'hover:bg-zinc-800/40 cursor-pointer' 
                          : 'hover:bg-zinc-800/10'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-tight">{transaction.label}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border leading-none ${
                            transaction.bizType === 'Moto' ? 'border-orange-500/50 text-orange-500' : 
                            transaction.bizType === 'Auto' ? 'border-blue-500/50 text-blue-500' : 
                            'border-zinc-700 text-zinc-500'
                          }`}>
                            {/* {transaction.bizType} */}
                            {/* {BUSINESS_TYPES.map((type) => ( t(`tabs.types.${type}`) ))} */}
                            {t(`tabs.types.${transaction.bizType}`)}
                          </span>
                          <span className="text-[10px] text-zinc-600 uppercase font-bold">
                            {tc(`expense_categories.${transaction.category}`)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        {/* <span className="text-[9px] font-mono text-zinc-600 uppercase">{transaction.payment_method || '—'}</span> */}
                        <span className="text-[9px] font-mono text-zinc-600 uppercase">{tc(`payment.method.${transaction.payment_method}`)  || '—'}</span>
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-bold ${transaction.type === 'income' ? 'text-white' : 'text-red-400'}`}>
                        {transaction.type === 'income' ? '' : '-'}{transaction.amount.toLocaleString()}
                      </td>
                    </tr> 
                  </Fragment>
                );
              })}
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




      {/* SELECT p.id AS payment_id,
    p.amount,
    p.status,
    p.is_paid,
    p.notes,
    p.created_at,
    co.type AS course_type,
    pp.label_key AS plan_localization_key,
    pm.label_key AS method_localization_key,
    pm.slug AS method_slug,
    p_client.first_name AS client_name,
    p_client.last_name AS client_last_name,
    cp.instructor_id,
    p.course_package_id
   FROM (((((((payments p
     LEFT JOIN course_packages cp ON ((p.course_package_id = cp.id)))
     LEFT JOIN courses co ON ((cp.course_id = co.id)))
     LEFT JOIN payment_plans pp ON ((p.payment_plan_id = pp.id)))
     LEFT JOIN payment_methods pm ON ((p.payment_method_id = pm.id)))
     LEFT JOIN accounts a ON ((p.account_id = a.id)))
     LEFT JOIN clients c ON ((a.client_id = c.id)))
     LEFT JOIN profiles p_client ON ((c.profile_id = p_client.id))); */}