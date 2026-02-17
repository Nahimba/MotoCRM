import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * OPTION 1: RAW DATA BACKUP (.sql)
 * Exports the actual records from the tables.
 */
export const exportDataBackup = async (setLoading: (l: boolean) => void) => {
  setLoading(true);
  try {
    const timestamp = new Date().toISOString();
    let sql = `-- MOTO CRM DATA DUMP\n-- Generated: ${timestamp}\n\n`;
    sql += `BEGIN;\nSET session_replication_role = 'replica';\n\n`;
    
    // Dependency-ordered list
    const tables = [
      'profiles', 'locations', 'payment_methods', 'payment_plans', 
      'courses', 'instructors', 'clients', 'accounts', 
      'course_instructors', 'course_packages', 'lessons', 
      'payments', 'business_expenses', 'client_documents', 
      'course_payment_allocations'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      
      if (error || !data || data.length === 0) {
        sql += `-- Table ${table}: No data or error fetching\n\n`;
        continue;
      }
      
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- DATA FOR TABLE: public.${table}\n`;
      sql += `-- --------------------------------------------------------\n`;
      
      const cols = Object.keys(data[0]);
      
      data.forEach(row => {
        const values = cols.map(c => {
          const val = row[c];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          // Escape single quotes for SQL strings
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        sql += `INSERT INTO "public"."${table}" ("${cols.join('", "')}") VALUES (${values.join(', ')});\n`;
      });

      // Add double whitespace between tables for clarity
      sql += `\n\n`;
    }

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
 * Exports the definitions of Views and Functions.
 */
export const exportSchemaBackup = async (setLoading: (l: boolean) => void) => {
  setLoading(true);
  try {
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase.rpc('get_db_metadata');
    
    if (error) throw error;

    let sql = `-- MOTO CRM SCHEMA DEFINITIONS\n-- Generated: ${timestamp}\n`;
    sql += `-- Includes Views and Functions definitions\n\n`;

    data.forEach((obj: any) => {
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- OBJECT: ${obj.obj_name} (${obj.obj_type})\n`;
      sql += `-- --------------------------------------------------------\n`;

      if (obj.obj_type === 'VIEW') {
        sql += `CREATE OR REPLACE VIEW "public"."${obj.obj_name}" AS\n${obj.obj_definition};\n\n\n`;
      } else {
        // Functions usually come with their own complete "CREATE OR REPLACE..." definition
        sql += `${obj.obj_definition};\n\n\n`;
      }
    });

    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8' });
    saveAs(blob, `motocrm_schema_${new Date().toISOString().split('T')[0]}.sql`);
  } catch (e) {
    console.error("Schema Export Error:", e);
  } finally {
    setLoading(false);
  }
};