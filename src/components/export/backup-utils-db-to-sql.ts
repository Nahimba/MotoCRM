import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * OPTION 1: RAW DATA BACKUP (.sql)
 * Exports rows from the tables in a specific dependency order.
 */
export const exportDataBackup = async (setLoading: (l: boolean) => void) => {
  setLoading(true);
  try {
    const timestamp = new Date().toISOString();
    let sql = `-- MOTO CRM DATA DUMP\n-- Generated: ${timestamp}\n\n`;
    
    // session_replication_role = replica disables FK checks for easier import
    sql += `BEGIN;\nSET session_replication_role = 'replica';\n\n`;
    
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
        sql += `-- Table ${table}: No data found\n\n`;
        continue;
      }
      
      sql += `-- --------------------------------------------------------\n`;
      sql += `-- DATA FOR: public.${table}\n`;
      sql += `-- --------------------------------------------------------\n`;
      
      const cols = Object.keys(data[0]);
      
      data.forEach(row => {
        const values = cols.map(c => {
          const val = row[c];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        sql += `INSERT INTO "public"."${table}" ("${cols.join('", "')}") VALUES (${values.join(', ')});\n`;
      });

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