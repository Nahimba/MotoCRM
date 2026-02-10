// app/[locale]/staff/clients/[id]/edit/page.tsx

import ClientForm from "@/components/staff/ClientForm" // Adjust path as needed
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

// In Next.js 15, params is a Promise
interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function EditClientPage({ params }: PageProps) {
  const { id } = await params

  // 1. Fetch the specific client data
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  // 2. Handle missing record
  if (error || !client) {
    notFound()
  }

  // 3. THE FIX: You must pass 'id' here. 
  // If 'id' is missing, ClientForm thinks it's a "New Recruit" (Insert)
  return (
    <div className="py-10">
      <ClientForm initialData={client} id={id} />
    </div>
  )
}