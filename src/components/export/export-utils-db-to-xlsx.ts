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

    

    const finalizeSheet = (sheet: ExcelJS.Worksheet) => {
      const columnCount = sheet.columns.length;
      if (columnCount === 0) return;
    
      // 1. View Settings
      sheet.views = [{
        state: 'frozen',
        xSplit: 0,
        ySplit: 1,
        activePane: 'bottomLeft',
        zoomScale: 100
      } as ExcelJS.WorksheetViewFrozen];
    
      // 2. Enable Filters
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columnCount }
      };
    
      // 3. Header Styling
      const headerRow = sheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        // Change FF0F172A (Navy) to FF475569 (Cool Gray) or FF333333 (Neutral Dark Gray)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; 
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      });
    
      // 4. Columns & Rows
      sheet.columns.forEach((column) => {
        let maxLen = 12;
    
        column.eachCell!({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber === 1) return;
    
          const row = sheet.getRow(rowNumber);
          const modelCells = (row as any).model?.cells;
          const firstCellInRow = row.getCell(1);
          
          // Determine if row is a separator (merged or Slate-200)
          const isSeparator = (modelCells && modelCells.length < columnCount) || 
                              (firstCellInRow.fill && (firstCellInRow.fill as any).fgColor?.argb === 'FFE2E8F0');
    
          if (!isSeparator) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } } };
          }
    
          // Safe width calculation
          const val = (cell.value && typeof cell.value !== 'object') ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
    
        column.width = Math.min(Math.max(maxLen + 4, 15), 50);
      });
    };

    

    

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
          instructor_id,
          courses(
            name,
            allow_quick_creation
          )
        )
      `).order('created_at', { ascending: true }),
      

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

    // SHEET 1: Учні
    const UKRAINIAN_MONTHS: { [key: number]: string } = {
      0: "Січень", 1: "Лютий", 2: "Березень", 3: "Квітень", 4: "Травень", 5: "Червень",
      6: "Липень", 7: "Серпень", 8: "Вересень", 9: "Жовтень", 10: "Листопад", 11: "Грудень"
    };

    // 1. Initialize the storage object
    const instructorStats: Record<string, any> = {};
    // --- 1. Create a Lookup Map for Instructor Names ---
    const instructorNameMap: Record<string, string> = {};


    
    // Example of how your data fetch might look
    const { data: lessons } = await supabase.from('lessons').select('*');
    const { data: coursePackages } = await supabase.from('course_packages').select('*, instructors(profiles(*)), courses(*)');




    

    // 2. Helper to format dates into "Month Year" (e.g., "Травень 2026")
    const getMonthYear = (dateStr: string | null) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      return `${UKRAINIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    };

    const initStat = (instId: string, month: string) => {
      if (!instructorStats[instId]) instructorStats[instId] = {};
      if (!instructorStats[instId][month]) {
        instructorStats[instId][month] = {
          revenue: 0,        // Actual Cash Received
          contractValue: 0,  // Total Value of Signed Contracts
          contracts: 0,   // Повні пакети
          quickSales: 0,  // Разові заняття (Quick Creation)
          hours: 0
        };
      }
    };



    // 1. Process Lessons (Hours)
    // We only count completed lessons to get actual worked hours
    if (lessons) {
      lessons.forEach(l => {
        if (l.status !== 'completed' || !l.instructor_id) return;
        const month = getMonthYear(l.session_date);
        initStat(l.instructor_id, month);
        instructorStats[l.instructor_id][month].hours += Number(l.duration) || 0;
      });
    }

    if (payments) {
      payments.forEach(p => {
        // Рахуємо лише фактично оплачені гроші
        if (!p.is_paid || !p.course_packages?.instructor_id) return;
    
        // Find the instructor linked to the package this payment was for
        const instId = p.course_packages?.instructor_id;
        
        if (!instId) return; // If payment isn't linked to a package, we can't credit an instructor
        
        const month = getMonthYear(p.created_at);
        initStat(instId, month);
        
        // Add to "Каса"
        instructorStats[instId][month].revenue += Number(p.amount) || 0;
      });
    }


    // 2. Обробка Пакетів (Контракти vs Разові)
    if (coursePackages) {
      coursePackages.forEach(cp => {
        if (!cp.instructor_id) return;
    
        // Мапа імен
        const inst = Array.isArray(cp.instructors) ? cp.instructors[0] : cp.instructors;
        const prof = Array.isArray(inst?.profiles) ? inst.profiles[0] : inst?.profiles;
        if (prof && !instructorNameMap[cp.instructor_id]) {
          instructorNameMap[cp.instructor_id] = `${prof.last_name || ''} ${prof.first_name || ''}`.trim();
        }
    
        const month = getMonthYear(cp.created_at);
        initStat(cp.instructor_id, month);
    
        // ЛОГІКА РАЗОВИХ: перевіряємо прапорець у таблиці courses
        const courseData = Array.isArray(cp.courses) ? cp.courses[0] : cp.courses;
        const isQuick = courseData?.allow_quick_creation === true;
    
        if (isQuick) {
          instructorStats[cp.instructor_id][month].quickSales += 1;
        } else {
          instructorStats[cp.instructor_id][month].contracts += 1;
        }
    
        // Загальна вартість проданого (план)
        instructorStats[cp.instructor_id][month].contractValue += Number(cp.contract_price) || 0;
      });
    }








    // // --- 1. Сначала расчет данных (ВАЖНО: этот блок должен быть ПЕРЕД созданием dashSheet) ---
    // const instructorRanking = Object.keys(instructorStats).map(id => {
    //   const months = Object.values(instructorStats[id]);
      
    //   // Явно типизируем объект totals
    //   const totals = months.reduce((acc: { revenue: number; hours: number }, curr: any) => ({
    //     revenue: acc.revenue + (curr.revenue || 0),
    //     hours: acc.hours + (curr.hours || 0),
    //   }), { revenue: 0, hours: 0 }); // Начальное значение — объект нужного типа

    //   return {
    //     name: instructorNameMap[id] || id,
    //     revenue: totals.revenue,
    //     hours: totals.hours
    //   };
    // }).sort((a, b) => b.revenue - a.revenue);


    // // --- SHEET 0: Дашборд (Создаем ПЕРВЫМ) ---
    // const dashSheet = workbook.addWorksheet("📊 Дашборд");

    // // 1. Общие показатели (KPI)
    // dashSheet.addRow(["ОСНОВНІ ПОКАЗНИКИ ШКОЛИ"]).font = { bold: true, size: 14 };
    // dashSheet.addRow([]); // Отступ

    // const totalRev = payments ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0;
    // const totalExp = expenses ? expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) : 0;

    // dashSheet.addRows([
    //   ["Параметр", "Значення"],
    //   ["Загальна каса (Дохід)", totalRev],
    //   ["Загальні витрати", totalExp],
    //   ["Чистий прибуток", totalRev - totalExp],
    // ]);

    // // Стилизация KPI таблицы
    // dashSheet.getRows(3, 4)?.forEach(row => {
    //   row.getCell(1).font = { bold: true };
    //   row.getCell(2).numFmt = '#,##0.00 "грн"';
    // });

    // dashSheet.addRow([]); // Отступ
    // dashSheet.addRow([]); // Отступ

    // // 2. Секция рейтинга (подготовим структуру под данные инструкторов)
    // dashSheet.addRow(["🏆 РЕЙТИНГ ІНСТРУКТОРІВ (ТОП ПО ДОХОДУ)"]).font = { bold: true, size: 12 };
    // const dashHeader = dashSheet.addRow(["Місце", "Інструктор", "Каса (грн)", "Години", "Ефективність (грн/год)"]);
    // dashHeader.font = { bold: true };
    // dashHeader.eachCell(c => {
    //     c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    //     c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    // });


    // instructorRanking.forEach((inst, idx) => {
    //   const efficiency = inst.hours > 0 ? inst.revenue / inst.hours : 0;
    //   dashSheet.addRow([
    //     idx + 1,
    //     inst.name,
    //     inst.revenue,
    //     inst.hours,
    //     efficiency
    //   ]);
    // });

    // // Форматування колонок Дашборда
    // dashSheet.getColumn(1).width = 10; // Місце
    // dashSheet.getColumn(2).width = 35; // Інструктор
    // dashSheet.getColumn(3).width = 20; // Збільшуємо ширину для Каси (було мало)
    // dashSheet.getColumn(4).width = 12; // Години
    // dashSheet.getColumn(5).width = 20; // Ефективність

    // // Убираем сетку для красоты
    // dashSheet.views = [{ showGridLines: false }];





    if (studentsRaw) {

      const sheet = workbook.addWorksheet("База клієнтів");
      sheet.columns = [
        { header: "Дата", key: "date", width: 15 },
        { header: "ПІБ", key: "fullName", width: 35 },
        { header: "Номер телефону", key: "phone", width: 20 },
        { header: "Курс", key: "course", width: 25 },
        { header: "Звідки клієнт", key: "source", width: 20 },
        { header: "Інструктор", key: "instructor", width: 25 },
        { header: "Документи", key: "docs", width: 20 },
        { header: "Тип КПП", key: "gear", width: 15 },
        { header: "Коментар", key: "comment", width: 40 }
      ];
    
      let lastMonthYear = "";
    
      studentsRaw.forEach((s) => {
        const dateObj = s.created_at ? new Date(s.created_at) : null;
        const currentMonthYear = dateObj ? `${UKRAINIAN_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}` : "";
    
        // 1. INSERT MONTH SEPARATOR
        if (currentMonthYear !== lastMonthYear && currentMonthYear !== "") {
          const monthRow = sheet.addRow({ date: currentMonthYear });
          sheet.mergeCells(monthRow.number, 1, monthRow.number, 9); // Merge across all columns
          monthRow.getCell(1).font = { bold: true, size: 12 };
          monthRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate-200
          monthRow.getCell(1).alignment = { horizontal: 'center' };
          lastMonthYear = currentMonthYear;
        }
    
        // 2. PREPARE CLIENT DATA
        const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const translatedGear = s.gear_type ? tConst(`gear_type.${s.gear_type}`) : '—';
        const translatedSource = s.lead_source ? tConst(`lead_sources.${s.lead_source}`) : '—';
        const translatedDocs = s.document_status ? tConst(`document_status.${s.document_status}`) : '—';
        
        const creator = Array.isArray(s.creator) ? s.creator[0] : s.creator;
        const createdByInstructorName = creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() : '—';
    
        // 3. HANDLE MULTIPLE PACKAGES
        const accounts = Array.isArray(s.accounts) ? s.accounts : (s.accounts ? [s.accounts] : []);
        let packages: any[] = [];
        
        accounts.forEach(acc => {
          const pkgs = Array.isArray(acc.course_packages) ? acc.course_packages : (acc.course_packages ? [acc.course_packages] : []);
          packages.push(...pkgs);
        });
    
        if (packages.length === 0) {
          // No packages, just add the client row
          sheet.addRow({
            date: dateObj ? dateObj.toLocaleDateString() : '',
            fullName: `${p?.last_name || ''} ${p?.first_name || ''} ${p?.middle_name || ''}`.trim(),
            phone: p?.phone || '',
            course: '—',
            source: translatedSource,
            instructor: createdByInstructorName,
            docs: translatedDocs,
            gear: translatedGear,
            comment: s.notes || ''
          });
        } else {
          // Add a row for EACH package
          packages.forEach((pkg, index) => {
            const crs = Array.isArray(pkg?.courses) ? pkg.courses[0] : pkg?.courses;
            const inst = Array.isArray(pkg?.instructors) ? pkg.instructors[0] : pkg?.instructors;
            const instP = Array.isArray(inst?.profiles) ? inst.profiles[0] : inst?.profiles;
    
            sheet.addRow({
              date: index === 0 ? (dateObj ? dateObj.toLocaleDateString() : '') : '', // Only show date on first row
              fullName: index === 0 ? `${p?.last_name || ''} ${p?.first_name || ''} ${p?.middle_name || ''}`.trim() : '', // Only show name on first row
              phone: index === 0 ? (p?.phone || '') : '', 
              course: crs?.name || '—',
              source: index === 0 ? translatedSource : '',
              instructor: instP ? `${instP.first_name || ''} ${instP.last_name || ''}`.trim() : createdByInstructorName,
              docs: index === 0 ? translatedDocs : '',
              gear: index === 0 ? translatedGear : '',
              comment: index === 0 ? (s.notes || '') : ''
            });
          });
        }
      });

      // Call the universal finalizer at the end
      finalizeSheet(sheet);
    }



  // --- SHEET 2: Документи ---
  if (docRecords) {
    const sheet = workbook.addWorksheet("Документи");

    // 1. Define Columns
    sheet.columns = [
      { header: "ПІБ", key: "fullName" },
      { header: "Номер телефону", key: "phone" },
      { header: "Етап навчання", key: "stage" },
      { header: "Назва документа", key: "docTitle" },
      { header: "Статус документа", key: "docStatus" },
      { header: "Дата подачі", key: "submissionDate" },
      { header: "Очікувана дата", key: "estReadyDate" },
      { header: "Посилання (URL)", key: "link" }
    ];

    // 2. Map Data
    const rows = docRecords.map(d => {
      // Extract linked data
      const cl = Array.isArray(d.clients) ? d.clients[0] : d.clients;
      const prof = Array.isArray(cl?.profiles) ? cl.profiles[0] : cl?.profiles;

      // Translation logic
      const translatedDocStatus = d.status ? tConst(`document_status.${d.status}`) : '—';
      const translatedStage = cl?.training_stage ? tConst(`student_stages.${cl.training_stage}`) : '—';

      return {
        fullName: prof 
          ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
          : '—',
        phone: prof?.phone || '',
        stage: translatedStage,
        docTitle: d.title || '—',
        docStatus: translatedDocStatus,
        submissionDate: d.submission_date ? new Date(d.submission_date).toLocaleDateString() : '—',
        estReadyDate: d.ready_date_est ? new Date(d.ready_date_est).toLocaleDateString() : '—',
        link: d.url || '—'
      };
    });

    // 3. Add Rows
    sheet.addRows(rows);

    // 4. Optional: Professional Link Formatting
    sheet.getColumn('link').eachCell((cell) => {
      if (cell.value && cell.value !== '—' && String(cell.value).startsWith('http')) {
        cell.value = { text: 'Відкрити', hyperlink: String(cell.value) };
        cell.font = { color: { argb: 'FF2563EB' }, underline: true };
      }
    });

    // 5. Finalize UI (Freeze, Filter, Style)
    finalizeSheet(sheet);
  }


  // SHEET: Revenue_Log
  if (payments) {
    const paySheet = workbook.addWorksheet("Оплати");
    paySheet.columns = [
      { header: "Дата", key: "date", width: 15 },
      { header: "Учень", key: "fullName", width: 35 },
      { header: "Сума", key: "amount", width: 15 },
      { header: "Курс", key: "course", width: 25 },
      { header: "Метод", key: "method", width: 20 },
      { header: "План оплати", key: "plan", width: 20 },
      { header: "Коментарі", key: "notes", width: 30 }
    ];

    let lastPayMonth = "";
    let monthStartIndex = 2; 
    let grandTotalRevenue = 0;

    payments.forEach((p, index) => {
      const dateObj = p.created_at ? new Date(p.created_at) : null;
      const currentMonthYear = dateObj ? `${UKRAINIAN_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}` : "";
      const amount = Number(p.amount) || 0;
      grandTotalRevenue += amount;

      // 1. MONTHLY SEPARATOR & SUBTOTAL LOGIC
      if (currentMonthYear !== lastPayMonth && currentMonthYear !== "") {
        if (lastPayMonth !== "") {
          const lastDataRow = paySheet.lastRow!.number;
          const subtotalRow = paySheet.addRow({ 
            fullName: `Дохід за ${lastPayMonth.split(' ')[0]}:`, 
            amount: { formula: `SUM(C${monthStartIndex}:C${lastDataRow})` } 
          });
          subtotalRow.font = { bold: true, italic: true, color: { argb: 'FF475569' } }; // Steel Gray
          subtotalRow.getCell(3).numFmt = '#,##0.00';
        }

        const monthRow = paySheet.addRow({ date: currentMonthYear });
        paySheet.mergeCells(monthRow.number, 1, monthRow.number, 7);
        monthRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
        monthRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Light Gray
        monthRow.getCell(1).alignment = { horizontal: 'center' };
        
        lastPayMonth = currentMonthYear;
        monthStartIndex = paySheet.lastRow!.number + 1;
      }

      // 2. DATA EXTRACTION (Simplified for brevity)
      const acc = Array.isArray(p.accounts) ? p.accounts[0] : p.accounts;
      const client = Array.isArray(acc?.clients) ? acc.clients[0] : acc?.clients;
      const prof = Array.isArray(client?.profiles) ? client.profiles[0] : client?.profiles;
      const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
      const plan = Array.isArray(p.payment_plans) ? p.payment_plans[0] : p.payment_plans;
      const pkg = Array.isArray(p.course_packages) ? p.course_packages[0] : p.course_packages;
      const crs = Array.isArray(pkg?.courses) ? pkg.courses[0] : pkg?.courses;

      // 3. ADD ROW
      paySheet.addRow({
        date: dateObj ? dateObj.toLocaleDateString() : '—',
        fullName: prof ? `${prof.last_name || ''} ${prof.first_name || ''}`.trim() : '—',
        amount: amount,
        course: crs?.name || '—',
        method: method?.slug || '—',
        plan: plan?.slug || '—',
        notes: p.notes || ''
      });
    });

    // 4. FINAL MONTH SUBTOTAL
    if (lastPayMonth !== "") {
      const lastDataRow = paySheet.lastRow!.number;
      const finalSubRow = paySheet.addRow({ 
        fullName: `Дохід за ${lastPayMonth.split(' ')[0]}:`, 
        amount: { formula: `SUM(C${monthStartIndex}:C${lastDataRow})` } 
      });
      finalSubRow.font = { bold: true, italic: true, color: { argb: 'FF475569' } };
    }

    // 5. GRAND TOTAL
    paySheet.addRow([]); 
    const totalRow = paySheet.addRow({
      fullName: "ЗАГАЛЬНИЙ ДОХІД:",
      amount: grandTotalRevenue
    });
    
    totalRow.eachCell(cell => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate Gray
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    });

    paySheet.getColumn('amount').numFmt = '#,##0.00';
    finalizeSheet(paySheet);
  }


    // --- SHEET 4: Витрати (Expenses) ---
    if (expenses) {
      const sheet = workbook.addWorksheet("Витрати");

      sheet.columns = [
        { header: "Дата", key: "date", width: 15 },
        { header: "Хто створив", key: "createdBy", width: 25 },
        { header: "Тип", key: "type", width: 15 },
        { header: "Категорія", key: "category", width: 20 },
        { header: "Сума", key: "amount", width: 15 }, // Column E (index 5)
        { header: "Спосіб оплати", key: "method", width: 20 },
        { header: "Опис", key: "desc", width: 40 }
      ];

      let lastMonthYear = ""; // Replaces lastPayMonth for this sheet
      let monthStartIndex = 2; 
      let grandTotalExpenses = 0;

      expenses.forEach((e) => {
        const dateObj = e.expense_date ? new Date(e.expense_date) : null;
        const currentMonthYear = dateObj ? `${UKRAINIAN_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}` : "";
        const amount = Number(e.amount) || 0;
        grandTotalExpenses += amount;

        // 1. MONTHLY SEPARATOR & SUBTOTAL
        // Changed 'lastPayMonth' to 'lastMonthYear' here
        if (currentMonthYear !== lastMonthYear && currentMonthYear !== "") {
          
          if (lastMonthYear !== "") {
            const lastDataRow = sheet.lastRow!.number;
            const subtotalRow = sheet.addRow({ 
              category: `Всього за ${lastMonthYear.split(' ')[0]}:`, 
              amount: { formula: `SUM(E${monthStartIndex}:E${lastDataRow})` } 
            });
            subtotalRow.font = { bold: true, italic: true };
            subtotalRow.getCell(5).numFmt = '#,##0.00';
          }

          const monthHeader = sheet.addRow({ date: currentMonthYear });
          sheet.mergeCells(monthHeader.number, 1, monthHeader.number, 7);
          monthHeader.getCell(1).font = { bold: true, size: 11 };
          monthHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          monthHeader.getCell(1).alignment = { horizontal: 'center' };
          
          lastMonthYear = currentMonthYear;
          monthStartIndex = sheet.lastRow!.number + 1;
        }

        // 2. DATA MAPPING
        const prof = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        const creatorName = prof 
          ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
          : '—';

        sheet.addRow({
          date: dateObj ? dateObj.toLocaleDateString() : '—',
          createdBy: creatorName,
          type: e.type ? tConst(`expense_types.${e.type}`) : (e.type || '—'),
          category: e.category ? tConst(`expense_categories.${e.category}`) : '—',
          amount: amount,
          method: e.payment_method ? tConst(`payment.method.${e.payment_method}`) : (e.payment_method || '—'),
          desc: e.description || ''
        });
      });

      // 3. FINAL MONTH SUBTOTAL
      if (lastMonthYear !== "") {
        const lastDataRow = sheet.lastRow!.number;
        const finalSubRow = sheet.addRow({ 
          category: `Всього за ${lastMonthYear.split(' ')[0]}:`, 
          amount: { formula: `SUM(E${monthStartIndex}:E${lastDataRow})` } 
        });
        finalSubRow.font = { bold: true, italic: true };
        finalSubRow.getCell(5).numFmt = '#,##0.00';
      }

      // 4. GRAND TOTAL
      sheet.addRow([]); // Spacer
      const totalRow = sheet.addRow({
        category: "ЗАГАЛЬНІ ВИТРАТИ:",
        amount: grandTotalExpenses
      });
      
      totalRow.eachCell(cell => {
        cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        // Change FF0F172A to FF334155 (Slate Gray)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      });

      sheet.getColumn('amount').numFmt = '#,##0.00';
      finalizeSheet(sheet);
    }







    
    


    // SHEET: Instructor_Summary
    const instSheet = workbook.addWorksheet("Підсумок по інструкторам");
    instSheet.columns = [
      { header: "Інструктор", key: "name", width: 25 },
      { header: "Період", key: "period", width: 15 },
      { header: "Продано (грн)", key: "contractValue", width: 18 },
      { header: "Каса (грн)", key: "revenue", width: 18 },
      { header: "Контракти", key: "contracts", width: 12 },
      { header: "Разові", key: "quickSales", width: 12 },
      { header: "Години", key: "hours", width: 10 }
    ];


    Object.keys(instructorStats).forEach(instId => {
      const instName = instructorNameMap[instId] || `ID: ${instId.substring(0, 5)}`;
      const months = Object.keys(instructorStats[instId]).sort();

      // Keep track of the first and last row of data for this instructor
      const startRow = instSheet.rowCount + 1;

      months.forEach(month => {
        const data = instructorStats[instId][month];
        instSheet.addRow({
          name: instName,
          period: month,
          contractValue: data.contractValue,
          revenue: data.revenue,
          contracts: data.contracts,
          quickSales: data.quickSales,
          hours: data.hours
        });
      });

      const endRow = instSheet.rowCount;

      // Add the Total Row using Excel Formulas
      // C = contractValue, D = revenue, E = contracts, F = quickSales, G = hours
      const totalRow = instSheet.addRow({
        name: `РАЗОМ: ${instName}`,
        contractValue: { formula: `SUM(C${startRow}:C${endRow})` },
        revenue: { formula: `SUM(D${startRow}:D${endRow})` },
        contracts: { formula: `SUM(E${startRow}:E${endRow})` },
        quickSales: { formula: `SUM(F${startRow}:F${endRow})` },
        hours: { formula: `SUM(G${startRow}:G${endRow})` }
      });

      // Styling remains the same
      totalRow.font = { bold: true };
      totalRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = { top: { style: 'thin' } };
      });
      instSheet.addRow([]); 
    });


    instSheet.getColumn('contractValue').numFmt = '#,##0.00';
    instSheet.getColumn('revenue').numFmt = '#,##0.00';

    

    

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






    // // 3. MAPPING DATA
    // // SHEET 1: Учні
    // if (studentsRaw) {
    //   addStyledSheet("База клієнтів", studentsRaw.map(s => {
    //     const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    //     const acc = Array.isArray(s.accounts) ? s.accounts[0] : s.accounts;
    //     const pkg = Array.isArray(acc?.course_packages) ? acc.course_packages[0] : acc?.course_packages;
    //     const crs = Array.isArray(pkg?.courses) ? pkg.courses[0] : pkg?.courses;
    //     const inst = Array.isArray(pkg?.instructors) ? pkg.instructors[0] : pkg?.instructors;
    //     const instP = Array.isArray(inst?.profiles) ? inst.profiles[0] : inst?.profiles;

    //     const translatedGear = s.gear_type ? tConst(`gear_type.${s.gear_type}`) : '—';
    //     const translatedSource = s.lead_source ? tConst(`lead_sources.${s.lead_source}`) : '—';
    //     const translatedDocs = s.document_status ? tConst(`document_status.${s.document_status}`) : '—';

    //     const creator = Array.isArray(s.creator) ? s.creator[0] : s.creator;
    //     const createdByInstructorName = creator 
    //       ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() 
    //       : '—';

    //     return {
    //       date: s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
    //       fullName: `${p?.last_name || ''} ${p?.first_name || ''} ${p?.middle_name || ''}`.trim(),
    //       phone: p?.phone || '',
    //       address: p?.address || '',
    //       course: crs?.name || '—',
    //       //source: s.lead_source || '',
    //       source: translatedSource,
    //       // instructor: instP ? `${instP.first_name || ''} ${instP.last_name || ''}`.trim() : '—',
    //       instructor: instP 
    //     ? `${instP.first_name || ''} ${instP.last_name || ''}`.trim() 
    //     : createdByInstructorName,
    //       //docs: s.document_status || '',
    //       docs: translatedDocs,
    //       //gear: s.gear_type || '',
    //       gear: translatedGear,
    //       comment: s.notes || ''
    //     };
    //   }), [
    //     { header: "Дата", key: "date" },
    //     { header: "ПІБ", key: "fullName" },
    //     { header: "Номер телефону", key: "phone" },
    //     { header: "Адреса", key: "address" },
    //     { header: "Курс", key: "course" },
    //     { header: "Звідки клієнт", key: "source" },
    //     { header: "Інструктор", key: "instructor" },
    //     { header: "Документи", key: "docs" },
    //     { header: "Тип КПП", key: "gear" },
    //     { header: "Коментар", key: "comment" }
    //   ]);
    // }







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



    // // SHEET: Revenue_Log
    // if (payments) {
    //   addStyledSheet("Оплати", payments.map(p => {

    //     const acc = Array.isArray(p.accounts) ? p.accounts[0] : p.accounts;
    //     const client = Array.isArray(acc?.clients) ? acc.clients[0] : acc?.clients;
    //     const prof = Array.isArray(client?.profiles) ? client.profiles[0] : client?.profiles;

    //     const method = Array.isArray(p.payment_methods) ? p.payment_methods[0] : p.payment_methods;
    //     const translatedMethod = method?.label_key ? t(method.label_key) : (method?.slug || '—');

    //     const plan = Array.isArray(p.payment_plans) ? p.payment_plans[0] : p.payment_plans;
    //     const translatedPlan = plan?.label_key ? t(plan.label_key) : (plan?.slug || '—');

    //     return {
    //     date: new Date(p.created_at).toLocaleDateString(),
    //     //client: `${p.accounts?.clients?.profiles?.first_name || ''} ${p.accounts?.clients?.profiles?.last_name || ''}`,
    //     fullName: prof 
    //     ? `${prof.last_name || ''} ${prof.first_name || ''} ${prof.middle_name || ''}`.trim() 
    //     : '—',
    //     amount: Number(p.amount),
    //     course: p.course_packages?.courses?.name || '—',
    //     //method: p.payment_methods?.label_key || 'Direct',
    //     method: translatedMethod,
    //     plan: translatedPlan,
    //     status: p.status,
    //     notes: p.notes,
    //     };
    //   }), [
    //     { header: "Дата", key: "date" },
    //     { header: "Учень", key: "fullName" },
    //     { header: "Сума", key: "amount" },
    //     { header: "Курс", key: "course" },
    //     { header: "Метод", key: "method" },
    //     { header: "План оплати", key: "plan" },
    //     // { header: "STATUS", key: "status" },
    //     { header: "Коментарі", key: "notes" }
    //   ]);
    // }





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


