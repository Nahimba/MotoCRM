import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



// /**
//  * Перетворює сирий рядок цифр у читабельний формат для відображення.
//  * Наприклад: 380931234567 -> +38 (093) 123 45 67
//  */
// export function formatPhoneDisplay(phone: string | null | undefined): string {
//   if (!phone) return '';

//   // Видаляємо всі нецифрові символи
//   const cleaned = phone.replace(/\D/g, '');

//   // Формат для України: +38 (0XX) XXX XX XX
//   if (cleaned.length === 12 && cleaned.startsWith('380')) {
//     return `+38 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
//   }
  
//   // Якщо введено 10 цифр (0XX XXX XX XX)
//   if (cleaned.length === 10 && cleaned.startsWith('0')) {
//     return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
//   }

//   // Якщо номер вже з плюсом або іншої країни, просто повертаємо як є
//   return phone;
// }


export const handlePhoneChange = (input: string): string => {
  // Дозволяємо лише цифри та "+" на початку
  const rawValue = input.startsWith('+') 
    ? '+' + input.replace(/\D/g, "") 
    : input.replace(/\D/g, "");

  // Обмеження 15 цифр (стандарт E.164) + символ плюса = 16
  return rawValue.length <= 16 ? rawValue : rawValue.slice(0, 16);
};


export const formatFlexiblePhone = (value: string | null | undefined): string => {
  if (!value) return "";
  
  let d = value.replace(/\D/g, "");
  
  // Авто-корекція: якщо користувач вводить 099... -> перетворюємо на 38099...
  // Це робить введення набагато зручнішим для українців
  if (d.length === 10 && d.startsWith("0")) {
    d = "38" + d;
  }
  
  if (d.length === 0) return value.includes('+') ? '+' : "";

  let f = ""; 
  // Маска: +38 (0XX) XXX XX XX
  if (d.length <= 2) {
    f = d;
  } else if (d.length <= 5) {
    f = `${d.slice(0, 2)} (${d.slice(2)}`;
  } else if (d.length <= 8) {
    f = `${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5)}`;
  } else if (d.length <= 10) {
    f = `${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)} ${d.slice(8)}`;
  } else {
    // Обмежуємо до 12 цифр (UA стандарт)
    f = `${d.slice(0, 2)} (${d.slice(2, 5)}) ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }

  return `+${f.trim()}`;
};


/**
 * Валідує та готує номер телефону для збереження в БД.
 * Повертає об'єкт з результатом валідації та очищеним номером.
 */
export function preparePhoneForSave(phone: string | null | undefined) {
  // 1. Очищуємо: залишаємо лише цифри та плюс
  let rawPhone = phone ? phone.replace(/[^\d+]/g, "") : "";

  // 2. Якщо номер не порожній і немає плюса — додаємо його
  if (rawPhone && !rawPhone.startsWith('+')) {
    rawPhone = '+' + rawPhone;
  }

  // 3. Рахуємо тільки кількість цифр для валідації
  const digitCount = rawPhone.replace(/\D/g, "").length;

  // 4. Перевірка довжини (стандарт E.164: від 7 до 15 цифр)
  const isValid = !rawPhone || (digitCount >= 7 && digitCount <= 15);

  return {
    isValid,
    phoneToSave: rawPhone || null,
    error: isValid ? null : "Невірний формат номера телефону"
  };
}