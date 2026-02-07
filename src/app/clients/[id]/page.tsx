"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, Image as ImageIcon } from "lucide-react"

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

type ClientDetails = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  files_storage_path?: string | null
  created_at?: string
}

export default function ClientDetailsPage() {
  const params = useParams()
  const id = params.id as string
  const [client, setClient] = useState<ClientDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchClient()
  }, [id])

  async function fetchClient() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, address, files_storage_path, created_at")
        .eq("id", id)
        .single()

      if (error) throw error
      setClient(data)
    } catch (e) {
      console.error("Error fetching client:", e)
      setClient(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Please choose an image (JPEG, PNG, GIF, or WebP).")
      return
    }

    setUploadError(null)
    setUploading(true)

    try {
      const ext = file.name.split(".").pop() || "jpg"
      const storagePath = `${id}/${Date.now()}.${ext}`

      const { error: uploadErrorResult } = await supabase.storage
        .from("client-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadErrorResult) {
        setUploadError(uploadErrorResult.message)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("client-files").getPublicUrl(storagePath)

      const { error: updateError } = await supabase
        .from("clients")
        .update({ files_storage_path: publicUrl })
        .eq("id", id)

      if (updateError) {
        setUploadError(updateError.message)
        return
      }

      setClient((prev) => (prev ? { ...prev, files_storage_path: publicUrl } : null))
    } catch (e) {
      console.error("Upload error:", e)
      setUploadError("Upload failed.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">Loading client…</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href="/clients" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </Button>

      <h1 className="text-3xl font-bold">{client.name}</h1>
      <p className="mt-1 text-muted-foreground">{client.email}</p>
      {(client.phone || client.address) && (
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          {client.phone && <p>Phone: {client.phone}</p>}
          {client.address && <p>Address: {client.address}</p>}
        </div>
      )}

      <section className="mt-10 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">File upload</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an image to store with this client. It will be saved to the
          client-files bucket and the URL saved in your database.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Label
              htmlFor="client-file-upload"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Choose image"}
              <input
                id="client-file-upload"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="sr-only"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </Label>
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
          </div>

          {client.files_storage_path && (
            <div className="min-w-0 flex-1">
              <Label className="text-xs text-muted-foreground">
                Current file
              </Label>
              <a
                href={client.files_storage_path}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                View / open link
              </a>
              <img
                src={client.files_storage_path}
                alt=""
                className="mt-2 max-h-40 rounded-md border object-cover"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
