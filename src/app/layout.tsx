// app/layout.tsx
import "./globals.css"
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from "sonner"
import { ThemeScript } from "@/components/theme-script" // Adjust path as needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-black text-white font-sans antialiased">
        <Toaster position="top-center" theme="dark" />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}