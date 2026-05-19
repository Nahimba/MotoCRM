import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * OPTION 1: RAW DATA BACKUP (.sql)
 * Exports rows from the tables in a specific dependency order.
 */
// export const exportDataBackup = async (setLoading: (l: boolean) => void) => {
//   setLoading(true);
//   try {
//     const timestamp = new Date().toISOString();
//     let sql = `-- MOTO CRM DATA DUMP\n-- Generated: ${timestamp}\n\n`;
    
//     // session_replication_role = replica disables FK checks for easier import
//     sql += `BEGIN;\nSET session_replication_role = 'replica';\n\n`;

//     const tables = [
//       'profiles',
//       'locations',
//       'payment_methods',
//       'payment_plans',
//       'courses',
//       'instructors',
//       'instructor_work_hours',
//       'instructor_exceptions',
//       'clients',
//       'accounts',
//       'course_instructors',
//       'course_packages',
//       'lessons',
//       'payments',
//       'business_expenses',
//       'client_documents',
//       'client_files',
//       'email_templates',
//       'audit_logs'
//     ];

//     for (const table of tables) {
//       const { data, error } = await supabase.from(table).select('*');
      
//       if (error || !data || data.length === 0) {
//         sql += `-- Table ${table}: No data found\n\n`;
//         continue;
//       }
      
//       sql += `-- --------------------------------------------------------\n`;
//       sql += `-- DATA FOR: public.${table}\n`;
//       sql += `-- --------------------------------------------------------\n`;
      
//       const cols = Object.keys(data[0]);
      
//       data.forEach(row => {
//         const values = cols.map(c => {
//           const val = row[c];
//           if (val === null) return 'NULL';
//           if (typeof val === 'boolean') return val ? 'true' : 'false';
//           if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
//           return `'${String(val).replace(/'/g, "''")}'`;
//         });
        
//         sql += `INSERT INTO "public"."${table}" ("${cols.join('", "')}") VALUES (${values.join(', ')});\n`;
//       });

//       sql += `\n\n`;
//     }

//     sql += `COMMIT;\nSET session_replication_role = 'origin';`;
    
//     const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
//     saveAs(blob, `motocrm_data_${new Date().toISOString().split('T')[0]}.sql`);
//   } catch (e) {
//     console.error("Data Export Error:", e);
//   } finally {
//     setLoading(false);
//   }
// };


export const exportDataBackup = async (setLoading: (l: boolean) => void) => {
  setLoading(true);
  try {
    const timestamp = new Date().toISOString();
    let sql = `-- MOTO CRM DATA DUMP\n-- Generated: ${timestamp}\n\n`;
    
    sql += `BEGIN;\nSET session_replication_role = 'replica';\n\n`;

    // 1. INJECT FIXED GLOBAL RUNTIME HELPER FUNCTION
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- MIGRATION HELPER: FORWARD COMPATIBLE AUTH INTEGRATION\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `CREATE OR REPLACE FUNCTION public.inline_migrate_auth_user(\n`;
    sql += `  p_profile_id uuid,\n`;
    sql += `  p_email text,\n`;
    sql += `  p_phone text,\n`;
    sql += `  p_full_name text,\n`;
    sql += `  p_role text,\n`;
    sql += `  p_avatar_url text,\n`;
    sql += `  p_first_name text,\n`;
    sql += `  p_last_name text,\n`;
    sql += `  p_address text,\n`;
    sql += `  p_social_link text,\n`;
    sql += `  p_created_at timestamp with time zone,\n`;
    sql += `  p_is_confirmed boolean,\n`;
    sql += `  p_middle_name text,\n`;
    sql += `  p_last_synced_email text\n`;
    sql += `) RETURNS void AS $$\n`;
    sql += `DECLARE\n`;
    sql += `  v_auth_id uuid;\n`;
    sql += `BEGIN\n`;
    sql += `  IF p_email IS NOT NULL THEN\n`;
    sql += `    SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email;\n`;
    sql += `    IF v_auth_id IS NULL THEN\n`;
    sql += `      v_auth_id := gen_random_uuid();\n`;
    // FIXED: Removed confirmed_at, added email_confirmed_at and phone_confirmed_at
    sql += `      INSERT INTO auth.users (id, instance_id, email, phone, email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role, is_super_admin)\n`;
    sql += `      VALUES (v_auth_id, '00000000-0000-0000-0000-000000000000', p_email, p_phone, now(), CASE WHEN p_phone IS NOT NULL THEN now() ELSE NULL END, '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_full_name), now(), now(), 'authenticated', 'authenticated', false);\n`;
    sql += `    END IF;\n`;
    sql += `  END IF;\n\n`;
    sql += `  INSERT INTO public.profiles (id, role, avatar_url, phone, email, first_name, last_name, address, social_link, created_at, is_confirmed, auth_user_id, middle_name, last_synced_email)\n`;
    sql += `  VALUES (p_profile_id, p_role, p_avatar_url, p_phone, p_email, p_first_name, p_last_name, p_address, p_social_link, p_created_at, p_is_confirmed, v_auth_id, p_middle_name, p_last_synced_email);\n`;
    sql += `END;\n$$ LANGUAGE plpgsql;\n\n`;

    const tables = [
      'profiles', 'locations', 'payment_methods', 'payment_plans',
      'courses', 'instructors', 'instructor_work_hours', 'instructor_exceptions',
      'clients', 'accounts', 'course_instructors', 'course_packages',
      'lessons', 'payments', 'business_expenses', 'client_documents',
      'client_files', 'email_templates', 'audit_logs'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      
      if (error || !data || data.length === 0) {
        sql += `-- Table ${table}: No data found\n\n`;
        continue;
      }
      
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- DATA FOR: public.${table}\n`;
      sql += `-- --------------------------------------------------------\n`;
      
      const cols = Object.keys(data[0]);
      
      data.forEach(row => {
        if (table === 'profiles') {
          const targetEmail = row.last_synced_email || row.email;
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
          
          const escapeStr = (val: any) => val === null || val === undefined ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;
          const escapeBool = (val: any) => val === null || val === undefined ? 'NULL' : (val ? 'true' : 'false');

          sql += `SELECT public.inline_migrate_auth_user(\n` +
            `  ${escapeStr(row.id)},\n` +
            `  ${escapeStr(targetEmail)},\n` +
            `  ${escapeStr(row.phone)},\n` +
            `  ${escapeStr(fullName)},\n` +
            `  ${escapeStr(row.role)},\n` +
            `  ${escapeStr(row.avatar_url)},\n` +
            `  ${escapeStr(row.first_name)},\n` +
            `  ${escapeStr(row.last_name)},\n` +
            `  ${escapeStr(row.address)},\n` +
            `  ${escapeStr(row.social_link)},\n` +
            `  ${escapeStr(row.created_at)},\n` +
            `  ${escapeBool(row.is_confirmed)},\n` +
            `  ${escapeStr(row.middle_name)},\n` +
            `  ${escapeStr(row.last_synced_email)}\n` +
            `);\n`;
          return;
        }

        const values = cols.map(c => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          
          // 1. Handle native arrays (like specializations text[])
          if (Array.isArray(val)) {
            const escapedArr = val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
            return `'{${escapedArr}}'`;
          }
          
          // FIXED: Handle JSONB / Objects safely before they fall back to String(val)
          if (typeof val === 'object') {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          }
          
          // 3. Handle standard strings, numbers, and dates
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        sql += `INSERT INTO "public"."${table}" ("${cols.join('", "')}") VALUES (${values.join(', ')});\n`;
      });

      sql += `\n\n`;
    }

    sql += `DROP FUNCTION IF EXISTS public.inline_migrate_auth_user;\n\n`;

    // POST-RESTORE VERIFICATION REPORT LOGS
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- POST-RESTORE IMPORT VERIFICATION REPORT\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DO $$\n`;
    sql += `DECLARE\n`;
    sql += `  r record;\n`;
    sql += `BEGIN\n`;
    sql += `  RAISE NOTICE '========== IMPORT VERIFICATION SUMMARY ==========';\n`;
    for (const t of tables) {
      sql += `  SELECT count(*) INTO r FROM public."${t}";\n`;
      sql += `  RAISE NOTICE 'Table public.%: % rows imported successfully.', '${t}', r.count;\n`;
    }
    sql += `  RAISE NOTICE '==================================================';\n`;
    sql += `END $$;\n\n`;
    
    sql += `COMMIT;\nSET session_replication_role = 'origin';`;
    
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
    saveAs(blob, `motocrm_data_${new Date().toISOString().split('T')[0]}.sql`);
  } catch (e) {
    console.error("Data Export Error:", e);
  } finally {
    setLoading(false);
  }
};


/**
 * OPTION 2: SCHEMA & METADATA BACKUP (.sql)
 * Full DB Creation query: Enums, Tables, Indexes, Functions, Views, and Triggers.
 */
export const exportSchemaBackup = async (setLoading: (l: boolean) => void) => {
  setLoading(true);
  try {
    const { data, error } = await supabase.rpc('get_db_metadata');
    
    if (error) throw error;

    let sql = `-- MOTO CRM FULL DATABASE SCHEMA\n-- Generated: ${new Date().toISOString()}\n\n`;
    
    // Strict order of operations to avoid dependency errors
    const typeOrder: Record<string, number> = {
      'ENUM': 1,
      'TABLE': 2,
      'INDEX': 3,
      'FUNCTION': 4,
      'VIEW': 5,
      'TRIGGER': 6
    };

    const sortedData = [...(data || [])].sort((a, b) => 
      (typeOrder[a.obj_type] || 99) - (typeOrder[b.obj_type] || 99)
    );

    sortedData.forEach((obj: any) => {
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- [${obj.obj_type}] ${obj.obj_name}\n`;
      sql += `-- --------------------------------------------------------\n`;

      if (obj.obj_type === 'ENUM') {
        sql += `DO $$\nBEGIN\n    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${obj.obj_name}') THEN\n        ${obj.obj_definition}\n    END IF;\nEND $$;\n\n`;
      } 
      else if (obj.obj_type === 'VIEW') {
        sql += `CREATE OR REPLACE VIEW "public"."${obj.obj_name}" AS\n${obj.obj_definition};\n\n`;
      } 
      else if (obj.obj_type === 'FUNCTION') {
        // Functions need a wrapper or CREATE OR REPLACE which is usually in the definition
        sql += `CREATE OR REPLACE FUNCTION ${obj.obj_name}() RETURNS trigger AS $$\n${obj.obj_definition}\n$$ LANGUAGE plpgsql;\n\n`;
      }
      else {
        // Tables, Indexes, and Triggers come with full defs
        sql += `${obj.obj_definition}\n\n`;
      }
    });

    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
    saveAs(blob, `motocrm_full_schema_${new Date().toISOString().split('T')[0]}.sql`);
  } catch (e) {
    console.error("Schema Export Error:", e);
  } finally {
    setLoading(false);
  }
};