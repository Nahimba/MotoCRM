import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * MOTO CRM BLACKBOX - EXECUTIVE XLSX EXPORT
 * Joins relational data into human-readable sheets.
 */
export const exportFullDatabase = async (setLoading: (loading: boolean) => void) => {
  setLoading(true);
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MotoCRM Blackbox';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();

    // 1. DATA FETCHING (Parallel with Deep Joins)
    const [
      { data: clients },
      { data: packages },
      { data: payments },
      { data: lessons },
      { data: expenses }
    ] = await Promise.all([
      // Detailed Clients List
      supabase.from('clients').select('*, profiles(*)'),
      
      // Training Progress (Joins client name and course name)
      supabase.from('course_packages').select('*, accounts(clients(profiles(first_name, last_name))), courses(name)'),
      
      // Financials (Joins client names and payment methods)
      supabase.from('payments').select('*, payment_methods(label_key), accounts(clients(profiles(first_name, last_name)))'),
      
      // Operational Log (Joins instructor name, course name, and location)
      supabase.from('lessons').select('*, instructors(profiles(first_name, last_name)), course_packages(courses(name)), locations(name)'),
      
      // Expenses
      supabase.from('business_expenses').select('*')
    ]);

    // 2. STYLING HELPER FUNCTION
    const addStyledSheet = (name: string, data: any[], columns: Partial<ExcelJS.Column>[]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;
      sheet.addRows(data);

      // Header Styling
      const headerRow = sheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Auto-Width Logic
      sheet.columns.forEach((column) => {
        let maxColumnLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? String(cell.value) : '';
          maxColumnLength = Math.max(maxColumnLength, cellValue.length);
        });
        column.width = Math.min(Math.max(maxColumnLength + 4, 15), 50);
      });

      // Zebra Striping
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    };

    // 3. MAPPING DATA TO HUMAN-READABLE FORMATS

    // SHEET: CLIENTS (The Database Core)
    if (clients) {
      addStyledSheet("CRM_Clients", clients.map(c => ({
        name: `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`,
        email: c.profiles?.email,
        phone: c.profiles?.phone,
        gear: c.gear_type,
        status: c.doc_status,
        tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
        source: c.lead_source,
        graduated: c.is_graduated ? "YES" : "NO",
        joined: new Date(c.created_at).toLocaleDateString()
      })), [
        { header: "FULL NAME", key: "name" },
        { header: "EMAIL", key: "email" },
        { header: "PHONE", key: "phone" },
        { header: "CATEGORY (AUTO/MOTO)", key: "gear" },
        { header: "DOCUMENT STATUS", key: "status" },
        { header: "TAGS", key: "tags" },
        { header: "LEAD SOURCE", key: "source" },
        { header: "GRADUATED", key: "graduated" },
        { header: "REGISTERED", key: "joined" }
      ]);
    }

    // SHEET: ACTIVE TRAINING (Packages & Contract Values)
    if (packages) {
      addStyledSheet("Training_Packages", packages.map(pkg => ({
        client: `${pkg.accounts?.clients?.profiles?.first_name || ''} ${pkg.accounts?.clients?.profiles?.last_name || ''}`,
        course: pkg.courses?.name,
        price: Number(pkg.contract_price),
        hours: pkg.total_hours,
        status: pkg.status,
        created: new Date(pkg.created_at).toLocaleDateString()
      })), [
        { header: "CLIENT", key: "client" },
        { header: "COURSE NAME", key: "course" },
        { header: "CONTRACT PRICE", key: "price" },
        { header: "TOTAL HOURS", key: "hours" },
        { header: "PACKAGE STATUS", key: "status" },
        { header: "ENROLLMENT DATE", key: "created" }
      ]);
    }

    // SHEET: FINANCIALS (Income/Revenue)
    if (payments) {
      addStyledSheet("Revenue_Log", payments.map(p => ({
        date: new Date(p.created_at).toLocaleDateString(),
        client: `${p.accounts?.clients?.profiles?.first_name || ''} ${p.accounts?.clients?.profiles?.last_name || ''}`,
        amount: Number(p.amount),
        method: p.payment_methods?.label_key || 'Direct',
        status: p.status,
        notes: p.notes
      })), [
        { header: "TRANSACTION DATE", key: "date" },
        { header: "CLIENT NAME", key: "client" },
        { header: "AMOUNT PAID", key: "amount" },
        { header: "METHOD", key: "method" },
        { header: "STATUS", key: "status" },
        { header: "NOTES", key: "notes" }
      ]);
    }

    // SHEET: OPERATIONS (Lesson history)
    if (lessons) {
      addStyledSheet("Operational_Lessons", lessons.map(l => ({
        date: new Date(l.session_date).toLocaleString(),
        instructor: `${l.instructors?.profiles?.first_name || ''} ${l.instructors?.profiles?.last_name || ''}`,
        course: l.course_packages?.courses?.name,
        location: l.locations?.name || 'N/A',
        duration: `${l.duration}h`,
        status: l.status,
        summary: l.summary
      })), [
        { header: "SESSION TIMESTAMP", key: "date" },
        { header: "INSTRUCTOR", key: "instructor" },
        { header: "COURSE/SERVICE", key: "course" },
        { header: "LOCATION", key: "location" },
        { header: "DURATION", key: "duration" },
        { header: "EXECUTION STATUS", key: "status" },
        { header: "SESSION NOTES", key: "summary" }
      ]);
    }

    // SHEET: EXPENSES
    if (expenses) {
      addStyledSheet("Business_Expenses", expenses.map(e => ({
        date: e.expense_date,
        amount: Number(e.amount),
        category: e.category,
        desc: e.description,
        type: e.type
      })), [
        { header: "DATE", key: "date" },
        { header: "AMOUNT", key: "amount" },
        { header: "CATEGORY", key: "category" },
        { header: "DESCRIPTION", key: "desc" },
        { header: "BUSINESS UNIT", key: "type" }
      ]);
    }

    // 4. FILE GENERATION
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `MotoCRM_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

  } catch (error) {
    console.error("EXCEL EXPORT ERROR:", error);
    throw error;
  } finally {
    setLoading(false);
  }
};