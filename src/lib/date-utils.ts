import { toZonedTime, formatInTimeZone, format } from 'date-fns-tz';

const TZ = 'Europe/Kyiv';

export const dateUtils = {
    /**
     * 1. GET TODAY (For DB Queries)
     * Returns YYYY-MM-DD in Kyiv time.
     */
    getKyivToday: () => {
        return format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd');
    },
  
    /**
     * 2. PARSE FROM DB (For Form Initialization)
     * Converts UTC string to individual Kyiv time parts.
     */
    parseFromDb: (utcDate: string | Date) => {
        const zoned = toZonedTime(new Date(utcDate), TZ);
        return {
        date: format(zoned, 'yyyy-MM-dd'),
        hour: format(zoned, 'HH'),
        minute: format(zoned, 'mm'),
        };
    },
  
    /**
     * 3. TO DB TIMESTAMP (For Submission)
     * Takes Kyiv form parts and creates a UTC ISO string with offset.
     */
    toDbTimestamp: (combined: string) => {
        // formatInTimeZone interprets 'combined' as being in 'TZ' 
        // and outputs it with the correct ISO offset (+02:00 or +03:00)
        return formatInTimeZone(combined, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    },

    // toDbTimestamp: (dateStr: string, hour: string, minute: string) => {
    //     // We create a "naked" ISO string that doesn't have an offset yet
    //     const combined = `${dateStr}T${hour}:${minute}:00`;
        
    //     // formatInTimeZone interprets 'combined' as being in 'TZ' 
    //     // and outputs it with the correct ISO offset (+02:00 or +03:00)
    //     return formatInTimeZone(combined, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
    // },

  
    /**
     * 4. FORMAT DISPLAY
     * Simple helper for tables/lists.
     */
    toDisplay: (utcDate: string | Date, pattern = 'MMM dd, HH:mm') => {
      return format(toZonedTime(new Date(utcDate), TZ), pattern);
    },

    // toDisplay: (utcDate: string | Date, pattern = 'dd.MM.yyyy, HH:mm') => {
    //     return format(toZonedTime(new Date(utcDate), TZ), pattern);
    // },
  };