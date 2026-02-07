'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Enrollment } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AttendanceLogger() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveEnrollments();
  }, []);

  async function fetchActiveEnrollments() {
    // We join with 'accounts' to get the student name
    const { data } = await supabase
      .from('enrollments')
      .select(`
        *,
        accounts ( full_name )
      `)
      .eq('status', 'active');
    if (data) setEnrollments(data);
  }

  const logSession = async (enrollment: any, hours: number) => {
    setLoading(true);
    const cost = enrollment.contract_price * hours;

    // 1. Log the attendance session
    const { error: attError } = await supabase.from('attendance_logs').insert({
      enrollment_id: enrollment.id,
      hours_spent: hours,
      session_date: new Date().toISOString()
    });

    // 2. Charge the Ledger (This triggers the balance update)
    const { error: ledgerError } = await supabase.from('ledger_entries').insert({
      account_id: enrollment.account_id,
      amount: -cost, // Negative because it's a service cost
      entry_type: 'salary_expense',
      description: `Training Session: ${hours} hours`
    });

    if (!attError && !ledgerError) {
      toast.success(`Logged ${hours}h for ${enrollment.accounts.full_name}`);
      fetchActiveEnrollments(); // Refresh hours left
    } else {
      toast.error("Failed to log session");
    }
    setLoading(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {enrollments.map((en) => (
        <Card key={en.id} className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              {en.accounts.full_name}
            </CardTitle>
            <div className="text-2xl font-bold">{en.remaining_hours} hrs left</div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button 
              className="flex-1" 
              onClick={() => logSession(en, 1)} 
              disabled={loading}
            >
              Log 1h
            </Button>
            <Button 
              className="flex-1 bg-orange-600 hover:bg-orange-700" 
              onClick={() => logSession(en, 2)}
              disabled={loading}
            >
              Log 2h
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}