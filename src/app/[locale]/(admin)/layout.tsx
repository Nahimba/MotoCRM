// src/app/[locale]/(admin)/layout.tsx
import AdminLayoutClient from "./AdminLayoutClient";

// Додаємо сюди ваші метадані
export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}