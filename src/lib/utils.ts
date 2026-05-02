import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




// export const handlePhoneChange = (input: string): string => {
//   // Дозволяємо лише цифри та "+" на початку
//   const rawValue = input.startsWith('+') 
//     ? '+' + input.replace(/\D/g, "") 
//     : input.replace(/\D/g, "");

//   // Обмеження 15 цифр (стандарт E.164) + символ плюса = 16
//   return rawValue.length <= 16 ? rawValue : rawValue.slice(0, 16);
// };

export const handlePhoneChange = (input: string): string => {
  // 1. Видаляємо все, крім цифр та знаку "+"
  let cleaned = input.replace(/[^\d+]/g, '');

  // 2. Гарантуємо, що "+" може бути тільки першим символом
  if (cleaned.includes('+')) {
    // Беремо "+" і додаємо до нього всі цифри, що йшли після нього або до нього
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // 3. Обмеження довжини (E.164: + і до 15 цифр)
  return cleaned.slice(0, 16);
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