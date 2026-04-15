import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * MOTO CRM BLACKBOX - EXECUTIVE XLSX EXPORT
 */
export const exportFullDatabase = async (setLoading: (loading: boolean) => void, 
t: (key: string) => string,
tConst: (key: string) => string
) => {
  setLoading(true);
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MotoCRM Blackbox';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();

    // 1. DATA FETCHING (Parallel with Deep Joins)
    const [
      { data: studentsRaw , error: err1},
      //{ data: clients, error: err2 },
      // { data: packages, error: err3  },
      { data: docRecords, error: err2 },
      { data: payments, error: err4 },
      // { data: lessons, error: err5  },
      { data: expenses, error: err6  }
    ] = await Promise.all([
      // Sheet: Учні - Note the nesting for instructors -> profiles
      // supabase.from('clients').select(`
      //   created_at,
      //   lead_source,
      //   document_status,
      //   gear_type,
      //   notes,
      //   profiles!clients_profile_id_fkey(first_name, last_name, middle_name, phone),
      //   accounts(
      //     course_packages(
      //       courses(name),
      //       instructors(profiles!clients_profile_id_fkey(first_name, last_name))
      //     )
      //   )
      // `),
      supabase.from('clients').select(`
        created_at, lead_source, document_status, gear_type, notes, created_by_profile_id,
        profiles:profiles!clients_profile_id_fkey(first_name, last_name, middle_name, phone, address),
        creator:profiles!clients_created_by_profile_id_fkey(first_name, last_name),
        accounts(
          course_packages(
            courses(name),
            instructors(profiles(first_name, last_name))
          )
        )
      `).order('created_at', { ascending: true }),


      // New query for Documents Sheet
      supabase.from('client_documents').select(`
        status,
        submission_date,
        ready_date_est,
        title,
        url,
        clients(
          training_stage,
          document_status,
          profiles:profile_id(first_name, last_name, middle_name, phone)
        )
      `).order('submission_date', { ascending: true }),



      // supabase.from('clients').select('*, profiles!clients_profile_id_fkey(*)'),
      
      //supabase.from('clients').select('*, profiles(*)'),
      
      // Sheet: CRM_Clients
      //supabase.from('clients').select('*, profiles!clients_profile_id_fkey(*)'),
      
      // // Sheet: Training_Packages
      // supabase.from('course_packages').select(`
      //   *, 
      //   accounts(
      //     clients(
      //       profiles!clients_profile_id_fkey(first_name, last_name)
      //     )
      //   ), 
      //   courses(name)
      // `),
      
      // // Sheet: Revenue_Log
      // supabase.from('payments').select(`
      //   *, 
      //   payment_methods(label_key), 
      //   accounts(
      //     clients(
      //       profiles!clients_profile_id_fkey(first_name, last_name)
      //     )
      //   )
      // `),

      supabase.from('payments').select(`
        *, 
        created_at,
        amount,
        status,
        is_paid,
        notes,
        payment_methods(label_key),
        payment_plans(label_key),
        accounts(
            clients(
              profiles:profile_id(first_name, last_name, middle_name)
            )
          ),
        course_packages(
          courses(name)
        )
      `).order('created_at', { ascending: true }),
      
      // // Sheet: Operational_Lessons
      // supabase.from('lessons').select(`
      //   *, 
      //   instructors(
      //     profiles!clients_profile_id_fkey(first_name, last_name)
      //   ), 
      //   course_packages(courses(name)), 
      //   locations(name)
      // `),
      

      // supabase.from('course_packages').select('*, accounts(clients(profiles(first_name, last_name))), courses(name)'),
      //supabase.from('payments').select('*, payment_methods(label_key), accounts(clients(profiles(first_name, last_name)))'),
      // supabase.from('lessons').select('*, instructors(profiles(first_name, last_name)), course_packages(courses(name)), locations(name)'),

      supabase
      .from('business_expenses')
      .select(`
        *,
        profiles:created_by_profile_id(first_name, last_name, middle_name)
      `)
      .order('expense_date', { ascending: true })

    ]);

    // Check for errors immediately
    const errors = [err1, err2, err4, err6].filter(Boolean);//  err3, err4, err5,
    if (errors.length > 0) {
      console.error("Supabase Query Errors:", errors);
      throw new Error("Failed to fetch database records");
    }

    // 2. STYLING HELPER FUNCTION
    const addStyledSheet = (name: string, data: any[], columns: Partial<ExcelJS.Column>[]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;
      sheet.addRows(data);

      const headerRow = sheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      sheet.columns.forEach((column) => {
        let maxColumnLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? String(cell.value) : '';
          maxColumnLength = Math.max(maxColumnLength, cellValue.length);
        });
        column.width = Math.min(Math.max(maxColumnLength + 4, 15), 50);
      });

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    };

    // 3. MAPPING DATA
    // SHEET 1: Учні
    if (studentsRaw) {
      addStyledSheet("База клієнтів", studentsRaw.map(s => {
        const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const acc = Array.isArray(s.accounts) ? s.accounts[0] : s.accounts;
        const pkg = Array.isArray(acc?.course_packages) ? acc.course_packages[0] : acc?.course_packages;
        const crs = Array.isArray(pkg?.courses) ? pkg.courses[0] : pkg?.courses;
        const inst = Array.isArray(pkg?.instructors) ? pkg.instructors[0] : pkg?.instructors;
        const instP = Array.isArray(inst?.profiles) ? inst.profiles[0] : inst?.profiles;

        const translatedGear = s.gear_type ? tConst(`gear_type.${s.gear_type}`) : '—';
        const translatedSource = s.lead_source ? tConst(`lead_sources.${s.lead_source}`) : '—';
        const translatedDocs = s.document_status ? tConst(`document_status.${s.document_status}`) : '—';

        const creator = Array.isArray(s.creator) ? s.creator[0] : s.creator;
        const createdByInstructorName = creator 
          ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() 
          : '—';

        return {
          date: s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
          fullName: `${p?.last_name || ''} ${p?.first_name || ''} ${p?.middle_name || ''}`.trim(),
          phone: p?.phone || '',
          address: p?.address || '',
          course: crs?.name || '—',
          //source: s.lead_source || '',
          source: translatedSource,
          // instructor: instP ? `${instP.first_name || ''} ${instP.last_name || ''}`.trim() : '—',
          instructor: instP 
        ? `${instP.first_name || ''} ${instP.last_name || ''}`.trim() 
        : createdByInstructorName,
          //docs: s.document_status || '',
          docs: translatedDocs,
          //gear: s.gear_type || '',
          gear: translatedGear,
          comment: s.notes || ''
        };
      }), [
        { header: "Дата", key: "date" },
        { header: "ПІБ", key: "fullName" },
        { header: "Номер телефону", key: "phone" },
        { header: "Адреса", key: "address" },
        { header: "Курс", key: "course" },
        { header: "Звідки клієнт", key: "source" },
        { header: "Інструктор", key: "instructor" },
        { header: "Документи", key: "docs" },
        { header: "Тип КПП", key: "gear" },
        { header: "Коментар", key: "comment" }
      ]);
    }


    // --- SHEET: Документи ---
    if (docRecords) {
      addStyledSheet("Документи", docRecords.map(d => {
        // 1. Extract linked data
        const cl = Array.isArray(d.clients) ? d.clients[0] : d.clients;
        const prof = Array.isArray(cl?.profiles) ? cl.profiles[0] : cl?.profiles;
    
        // 2. Translation logic (Multiple layers)
        
        // Specific doc status (e.g. 'ready')
        const translatedDocStatus = d.status ? tConst(`document_status.${d.status}`) : '—';
        
        // Overall client document status (from 'clients' table)
        const translatedOverallStatus = cl?.document_status ? tConst(`document_status.${cl.document_status}`) : '—';
        
        // Training Stage translation
        const translatedStage = cl?.training_stage ? tConst(`student_stages.${cl.training_stage}`) : '—';
    
        return {
          fullName: prof 
            ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
            : '—',
          phone: prof?.phone || '',
          stage: translatedStage,             // From student_stages JSON
          overallStatus: translatedOverallStatus, // Client table
          docTitle: d.title || '—',
          docStatus: translatedDocStatus,      // Client_documents table
          link: d.url || '—',
          submissionDate: d.submission_date ? new Date(d.submission_date).toLocaleDateString() : '—',
          estReadyDate: d.ready_date_est ? new Date(d.ready_date_est).toLocaleDateString() : '—'
        };
      }), [
        { header: "ПІБ", key: "fullName" },
        { header: "Номер телефону", key: "phone" },
        { header: "Етап навчання", key: "stage" },
        // { header: "Загальний статус док.", key: "overallStatus" },
        { header: "Назва документа", key: "docTitle" },
        { header: "Статус документа", key: "docStatus" },
        { header: "Дата подачі", key: "submissionDate" },
        { header: "Очікувана дата", key: "estReadyDate" },
        { header: "Посилання (URL)", key: "link" }
      ]);
    }

    // const tConst = useTranslations("Constants")
    // {tConst ("gear_type.Manual")}
    // {tConst ("gear_type.Auto")}
    // {tConst("lead_source.....")}


    // SHEET: CRM_Clients
    // if (clients) {
    //   addStyledSheet("CRM_Clients", clients.map(c => ({
    //     name: `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`,
    //     email: c.profiles?.email,
    //     phone: c.profiles?.phone,
    //     gear: c.gear_type,
    //     status: c.document_status,
    //     tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
    //     source: c.lead_source,
    //     graduated: c.training_stage === 'graduated' ? "YES" : "NO",
    //     joined: new Date(c.created_at).toLocaleDateString()
    //   })), [
    //     { header: "FULL NAME", key: "name" },
    //     { header: "EMAIL", key: "email" },
    //     { header: "PHONE", key: "phone" },
    //     { header: "CATEGORY", key: "gear" },
    //     { header: "DOC STATUS", key: "status" },
    //     { header: "TAGS", key: "tags" },
    //     { header: "SOURCE", key: "source" },
    //     { header: "GRADUATED", key: "graduated" },
    //     { header: "REGISTERED", key: "joined" }
    //   ]);
    // }

    // // SHEET: Training_Packages
    // if (packages) {
    //   addStyledSheet("Training_Packages", packages.map(pkg => ({
    //     client: `${pkg.accounts?.clients?.profiles?.first_name || ''} ${pkg.accounts?.clients?.profiles?.last_name || ''}`,
    //     course: pkg.courses?.name,
    //     price: Number(pkg.contract_price),
    //     hours: pkg.total_hours,
    //     status: pkg.status,
    //     created: new Date(pkg.created_at).toLocaleDateString()
    //   })), [
    //     { header: "CLIENT", key: "client" },
    //     { header: "COURSE", key: "course" },
    //     { header: "PRICE", key: "price" },
    //     { header: "HOURS", key: "hours" },
    //     { header: "STATUS", key: "status" },
    //     { header: "DATE", key: "created" }
    //   ]);
    // }

    // SHEET: Revenue_Log
    if (payments) {
      addStyledSheet("Оплати", payments.map(p => {

        const acc = Array.isArray(p.accounts) ? p.accounts[0] : p.accounts;
        const client = Array.isArray(acc?.clients) ? acc.clients[0] : acc?.clients;
        const prof = Array.isArray(client?.profiles) ? client.profiles[0] : client?.profiles;

        const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
        const translatedMethod = method?.label_key ? t(method.label_key) : (method?.slug || '—');

        const plan = Array.isArray(p.payment_plans) ? p.payment_plans[0] : p.payment_plans;
        const translatedPlan = plan?.label_key ? t(plan.label_key) : (plan?.slug || '—');

        return {
        date: new Date(p.created_at).toLocaleDateString(),
        //client: `${p.accounts?.clients?.profiles?.first_name || ''} ${p.accounts?.clients?.profiles?.last_name || ''}`,
        fullName: prof 
        ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
        : '—',
        amount: Number(p.amount),
        course: p.course_packages?.courses?.name || '—',
        //method: p.payment_methods?.label_key || 'Direct',
        method: translatedMethod,
        plan: translatedPlan,
        status: p.status,
        notes: p.notes,
        };
      }), [
        { header: "Дата", key: "date" },
        { header: "Учень", key: "fullName" },
        { header: "Сума", key: "amount" },
        { header: "Курс", key: "course" },
        { header: "Метод", key: "method" },
        { header: "План оплати", key: "plan" },
        // { header: "STATUS", key: "status" },
        { header: "Коментарі", key: "notes" }
      ]);
    }

    // // SHEET: Operational_Lessons
    // if (lessons) {
    //   addStyledSheet("Operational_Lessons", lessons.map(l => ({
    //     date: new Date(l.session_date).toLocaleString(),
    //     instructor: `${l.instructors?.profiles?.first_name || ''} ${l.instructors?.profiles?.last_name || ''}`,
    //     course: l.course_packages?.courses?.name,
    //     location: l.locations?.name || 'N/A',
    //     duration: `${l.duration}h`,
    //     status: l.status,
    //     summary: l.summary
    //   })), [
    //     { header: "TIMESTAMP", key: "date" },
    //     { header: "INSTRUCTOR", key: "instructor" },
    //     { header: "COURSE", key: "course" },
    //     { header: "LOCATION", key: "location" },
    //     { header: "DURATION", key: "duration" },
    //     { header: "STATUS", key: "status" },
    //     { header: "NOTES", key: "summary" }
    //   ]);
    // }

    // SHEET: Business_Expenses
    if (expenses) {
      addStyledSheet("Витрати", expenses.map(e => {

        // 1. Extract Profile Data
        const prof = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        const creatorName = prof 
          ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
          : '—';

        const translatedCategory = e.category ? tConst(`expense_categories.${e.category}`) : '—';
        const translatedType = e.type ? tConst(`expense_types.${e.type}`) : (e.type || '—');

        // Corrected translation path for payment method
        const localizedMethod = e.payment_method 
        ? tConst(`payment.method.${e.payment_method}`) 
        : (e.payment_method || '—');

        return {
          date: e.expense_date ? new Date(e.expense_date).toLocaleDateString() : '—',
          amount: Number(e.amount) || 0,
          category: translatedCategory,
          desc: e.description || '',
          type: translatedType,
          method: localizedMethod,
          createdBy: creatorName
        };
      }), [
        { header: "Дата", key: "date" },
        { header: "Хто створив", key: "createdBy" },
        { header: "Тип", key: "type" },
        { header: "Категорія", key: "category" },
        { header: "Сума", key: "amount" },
        { header: "Спосіб оплати", key: "method" },
        { header: "Опис", key: "desc" }
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




// import ExcelJS from 'exceljs';
// import { saveAs } from 'file-saver';
// import { supabase } from '@/lib/supabase';

// /**
//  * MOTO CRM BLACKBOX - EXECUTIVE XLSX EXPORT
//  * Joins relational data into human-readable sheets.
//  */
// export const exportFullDatabase = async (setLoading: (loading: boolean) => void) => {
//   setLoading(true);
//   try {
//     const workbook = new ExcelJS.Workbook();
//     workbook.creator = 'MotoCRM Blackbox';
//     workbook.lastModifiedBy = 'Admin';
//     workbook.created = new Date();

//     // 1. DATA FETCHING (Parallel with Deep Joins)
//     const [
//       { data: clients },
//       { data: packages },
//       { data: payments },
//       { data: lessons },
//       { data: expenses }
//     ] = await Promise.all([
//       // Detailed Clients List
//       supabase.from('clients').select('*, profiles(*)'),
      
//       // Training Progress (Joins client name and course name)
//       supabase.from('course_packages').select('*, accounts(clients(profiles(first_name, last_name))), courses(name)'),
      
//       // Financials (Joins client names and payment methods)
//       supabase.from('payments').select('*, payment_methods(label_key), accounts(clients(profiles(first_name, last_name)))'),
      
//       // Operational Log (Joins instructor name, course name, and location)
//       supabase.from('lessons').select('*, instructors(profiles(first_name, last_name)), course_packages(courses(name)), locations(name)'),
      
//       // Expenses
//       supabase.from('business_expenses').select('*')
//     ]);

//     // 2. STYLING HELPER FUNCTION
//     const addStyledSheet = (name: string, data: any[], columns: Partial<ExcelJS.Column>[]) => {
//       const sheet = workbook.addWorksheet(name);
//       sheet.columns = columns;
//       sheet.addRows(data);

//       // Header Styling
//       const headerRow = sheet.getRow(1);
//       headerRow.height = 25;
//       headerRow.eachCell((cell) => {
//         cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
//         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
//         cell.alignment = { vertical: 'middle', horizontal: 'left' };
//       });

//       // Auto-Width Logic
//       sheet.columns.forEach((column) => {
//         let maxColumnLength = 0;
//         column.eachCell!({ includeEmpty: true }, (cell) => {
//           const cellValue = cell.value ? String(cell.value) : '';
//           maxColumnLength = Math.max(maxColumnLength, cellValue.length);
//         });
//         column.width = Math.min(Math.max(maxColumnLength + 4, 15), 50);
//       });

//       // Zebra Striping
//       sheet.eachRow((row, rowNumber) => {
//         if (rowNumber > 1 && rowNumber % 2 === 0) {
//           row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
//         }
//       });
//     };

//     // 3. MAPPING DATA TO HUMAN-READABLE FORMATS

//     // SHEET: CLIENTS (The Database Core)
//     if (clients) {
//       addStyledSheet("CRM_Clients", clients.map(c => ({
//         name: `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`,
//         email: c.profiles?.email,
//         phone: c.profiles?.phone,
//         gear: c.gear_type,
//         status: c.doc_status,
//         tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
//         source: c.lead_source,
//         graduated: c.is_graduated ? "YES" : "NO",
//         joined: new Date(c.created_at).toLocaleDateString()
//       })), [
//         { header: "FULL NAME", key: "name" },
//         { header: "EMAIL", key: "email" },
//         { header: "PHONE", key: "phone" },
//         { header: "CATEGORY (AUTO/MOTO)", key: "gear" },
//         { header: "DOCUMENT STATUS", key: "status" },
//         { header: "TAGS", key: "tags" },
//         { header: "LEAD SOURCE", key: "source" },
//         { header: "GRADUATED", key: "graduated" },
//         { header: "REGISTERED", key: "joined" }
//       ]);
//     }

//     // SHEET: ACTIVE TRAINING (Packages & Contract Values)
//     if (packages) {
//       addStyledSheet("Training_Packages", packages.map(pkg => ({
//         client: `${pkg.accounts?.clients?.profiles?.first_name || ''} ${pkg.accounts?.clients?.profiles?.last_name || ''}`,
//         course: pkg.courses?.name,
//         price: Number(pkg.contract_price),
//         hours: pkg.total_hours,
//         status: pkg.status,
//         created: new Date(pkg.created_at).toLocaleDateString()
//       })), [
//         { header: "CLIENT", key: "client" },
//         { header: "COURSE NAME", key: "course" },
//         { header: "CONTRACT PRICE", key: "price" },
//         { header: "TOTAL HOURS", key: "hours" },
//         { header: "PACKAGE STATUS", key: "status" },
//         { header: "ENROLLMENT DATE", key: "created" }
//       ]);
//     }

//     // SHEET: FINANCIALS (Income/Revenue)
//     if (payments) {
//       addStyledSheet("Revenue_Log", payments.map(p => ({
//         date: new Date(p.created_at).toLocaleDateString(),
//         client: `${p.accounts?.clients?.profiles?.first_name || ''} ${p.accounts?.clients?.profiles?.last_name || ''}`,
//         amount: Number(p.amount),
//         method: p.payment_methods?.label_key || 'Direct',
//         status: p.status,
//         notes: p.notes
//       })), [
//         { header: "TRANSACTION DATE", key: "date" },
//         { header: "CLIENT NAME", key: "client" },
//         { header: "AMOUNT PAID", key: "amount" },
//         { header: "METHOD", key: "method" },
//         { header: "STATUS", key: "status" },
//         { header: "NOTES", key: "notes" }
//       ]);
//     }

//     // SHEET: OPERATIONS (Lesson history)
//     if (lessons) {
//       addStyledSheet("Operational_Lessons", lessons.map(l => ({
//         date: new Date(l.session_date).toLocaleString(),
//         instructor: `${l.instructors?.profiles?.first_name || ''} ${l.instructors?.profiles?.last_name || ''}`,
//         course: l.course_packages?.courses?.name,
//         location: l.locations?.name || 'N/A',
//         duration: `${l.duration}h`,
//         status: l.status,
//         summary: l.summary
//       })), [
//         { header: "SESSION TIMESTAMP", key: "date" },
//         { header: "INSTRUCTOR", key: "instructor" },
//         { header: "COURSE/SERVICE", key: "course" },
//         { header: "LOCATION", key: "location" },
//         { header: "DURATION", key: "duration" },
//         { header: "EXECUTION STATUS", key: "status" },
//         { header: "SESSION NOTES", key: "summary" }
//       ]);
//     }

//     // SHEET: EXPENSES
//     if (expenses) {
//       addStyledSheet("Business_Expenses", expenses.map(e => ({
//         date: e.expense_date,
//         amount: Number(e.amount),
//         category: e.category,
//         desc: e.description,
//         type: e.type
//       })), [
//         { header: "DATE", key: "date" },
//         { header: "AMOUNT", key: "amount" },
//         { header: "CATEGORY", key: "category" },
//         { header: "DESCRIPTION", key: "desc" },
//         { header: "BUSINESS UNIT", key: "type" }
//       ]);
//     }

//     // 4. FILE GENERATION
//     const buffer = await workbook.xlsx.writeBuffer();
//     const fileName = `MotoCRM_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
//     saveAs(new Blob([buffer]), fileName);

//   } catch (error) {
//     console.error("EXCEL EXPORT ERROR:", error);
//     throw error;
//   } finally {
//     setLoading(false);
//   }
// };


