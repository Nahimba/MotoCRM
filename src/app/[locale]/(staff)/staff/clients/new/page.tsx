// app/[locale]/staff/clients/new/page.tsx
"use client" // Good practice for Universal apps to keep route segments predictable

import ClientForm from "@/components/staff/ClientForm"

export default function NewClientPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      {/* No initialData or id passed here. 
          ClientForm will correctly show "New Recruit" 
      */}
      <ClientForm />
    </div>
  )
}