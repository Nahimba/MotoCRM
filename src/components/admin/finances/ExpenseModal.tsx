"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any; 
}

export default function ExpenseModal({ isOpen, onClose, onSuccess, editData }: ExpenseModalProps) {
  // Инициализация переводов
  const t = useTranslations('admin.finances.modal');
  const catT = useTranslations('admin.finances.categories');
  
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    amount: '',
    category: 'fuel',
    type: 'Moto',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash'
  });

  // Загружаем методы оплаты один раз при монтировании
  useEffect(() => {
    const fetchMethods = async () => {
      const { data } = await supabase.from('payment_methods').select('*');
      if (data) setMethods(data);
    };
    fetchMethods();
  }, []);

  // Синхронизируем форму при открытии или смене editData
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          amount: editData.amount.toString(),
          category: editData.category || 'fuel',
          type: editData.bizType || 'Moto',
          description: editData.description || '',
          expense_date: format(new Date(editData.date), 'yyyy-MM-dd'),
          payment_method: editData.payment_method || 'cash'
        });
      } else {
        setForm({
          amount: '',
          category: 'fuel',
          type: 'Moto',
          description: '',
          expense_date: format(new Date(), 'yyyy-MM-dd'),
          payment_method: 'cash'
        });
      }
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      amount: parseFloat(form.amount),
      category: form.category,
      type: form.type,
      description: form.description,
      expense_date: form.expense_date,
      payment_method: form.payment_method,
      created_by_profile_id: user?.id
    };

    let error;
    if (editData) {
      const { error: updateError } = await supabase
        .from('business_expenses')
        .update(payload)
        .eq('id', editData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('business_expenses')
        .insert([payload]);
      error = insertError;
    }

    if (!error) {
      onSuccess();
      onClose();
    } else {
      console.error("Database Error:", error);
      alert(t('error_save'));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!editData || !window.confirm(t('delete_confirm'))) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('business_expenses')
      .delete()
      .eq('id', editData.id);

    if (!error) {
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const categories = ['fuel', 'rent', 'salary', 'repair', 'marketing', 'other'];

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 p-8 rounded-[40px] w-full max-w-md relative shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Декоративный эффект */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-8 relative z-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">
            {editData ? t('edit_title') : t('new_title')}
          </h2>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-2">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* СУММА */}
          <div className="space-y-1 text-center">
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{t('amount')}</label>
            <input 
              type="number" required step="0.01" autoFocus
              className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white rounded-none py-4 text-4xl font-black outline-none transition-all text-white text-center placeholder:text-zinc-900"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm({...form, amount: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ДАТА */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">{t('date')}</label>
              <div className="relative">
                <input 
                  type="date" required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-[11px] font-bold outline-none text-white appearance-none focus:border-zinc-500 transition-colors"
                  value={form.expense_date}
                  onChange={e => setForm({...form, expense_date: e.target.value})}
                />
              </div>
            </div>

            {/* МЕТОД ОПЛАТЫ */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">{t('method')}</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-[11px] font-bold outline-none text-white appearance-none cursor-pointer focus:border-zinc-500 transition-colors"
                value={form.payment_method}
                onChange={e => setForm({...form, payment_method: e.target.value})}
              >
                {methods.map(m => (
                  <option key={m.id} value={m.slug}>{m.slug.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ТИП БИЗНЕСА */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">{t('biz_type')}</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-[11px] font-bold outline-none text-white appearance-none cursor-pointer"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              >
                <option value="Moto">MOTO</option>
                <option value="Auto">AUTO</option>
                <option value="General">GENERAL</option>
              </select>
            </div>

            {/* КАТЕГОРИЯ */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">{t('category')}</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-[11px] font-bold outline-none text-white appearance-none cursor-pointer uppercase"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {catT(cat).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ОПИСАНИЕ */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">{t('description')}</label>
            <textarea 
              placeholder={t('description_placeholder')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-20 text-[11px] font-bold outline-none text-white resize-none focus:border-zinc-500 transition-colors"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          {/* КНОПКИ ДЕЙСТВИЯ */}
          <div className="pt-2 space-y-3">
            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-white text-black font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? t('btn_processing') : editData ? t('btn_update') : t('btn_confirm')}
            </button>

            {editData && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full bg-transparent text-red-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-red-600/10 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> {t('btn_delete')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}