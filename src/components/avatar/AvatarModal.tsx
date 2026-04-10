"use client"

import { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { X, Loader2, Camera, Check, Maximize2, Image as ImageIcon } from "lucide-react"
import Cropper from 'react-easy-crop'
import { toast } from "sonner"

// Helper remains internal to keep the component self-contained
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve) => (image.onload = resolve))

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No 2d context")

  const targetSize = 256
  canvas.width = targetSize
  canvas.height = targetSize

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, targetSize, targetSize
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8)
  })
}

interface AvatarModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (fileName: string) => void
  currentAvatarUrl?: string // Useful if you want to delete old ones inside the modal
}

export function AvatarModal({ isOpen, onClose, onUploadSuccess, currentAvatarUrl }: AvatarModalProps) {
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setImage(null)
      setZoom(1)
    }
  }, [isOpen])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return
    setIsUploading(true)
    
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels)
      const fileName = `${crypto.randomUUID()}.jpg`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob)

      if (uploadError) throw uploadError

      // Optional: Cleanup logic could live here if you want the modal to handle everything
      onUploadSuccess(fileName)
      onClose()
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[3rem] p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
          <X size={20}/>
        </button>

        <div className="text-center mb-8">
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Редактор фото</h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Оберіть джерело</p>
        </div>

        <div className="relative w-full aspect-square bg-zinc-900/50 rounded-3xl overflow-hidden border border-zinc-800 mb-6 touch-none">
          {image ? (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon size={24} className="text-zinc-400 group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">Галерея</span>
                </button>

                <button 
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={24} className="text-zinc-400 group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">Камера</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {image && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <Maximize2 size={14} className="text-zinc-600" />
               <input 
                type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setImage(null)} className="py-4 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-2xl">
                Скасувати
              </button>
              <button 
                type="button" 
                onClick={handleSave} 
                disabled={isUploading}
                className="py-4 bg-primary text-black text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Підтвердити
              </button>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
        <input type="file" ref={cameraInputRef} onChange={onFileChange} accept="image/*" capture="user" className="hidden" />
      </div>
    </div>
  )
}



// "use client"

// import { useState, useRef, useEffect } from "react"
// import { supabase } from "@/lib/supabase"
// import { X, Loader2, Camera, Check, Maximize2, Image as ImageIcon } from "lucide-react"
// import Cropper from 'react-easy-crop'
// import { toast } from "sonner"

// async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
//   const image = new Image()
//   image.src = imageSrc
//   await new Promise((resolve) => (image.onload = resolve))

//   const canvas = document.createElement("canvas")
//   const ctx = canvas.getContext("2d")
//   if (!ctx) throw new Error("No 2d context")

//   const targetSize = 256 
//   canvas.width = targetSize
//   canvas.height = targetSize

//   ctx.drawImage(
//     image,
//     pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
//     0, 0, targetSize, targetSize
//   )

//   return new Promise((resolve) => {
//     canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8)
//   })
// }

// interface AvatarModalProps {
//   isOpen: boolean
//   onClose: () => void
//   onUploadSuccess: (fileName: string) => void
// }

// export function AvatarModal({ isOpen, onClose, onUploadSuccess }: AvatarModalProps) {
//   const [image, setImage] = useState<string | null>(null)
//   const [crop, setCrop] = useState({ x: 0, y: 0 })
//   const [zoom, setZoom] = useState(1)
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
//   const [isUploading, setIsUploading] = useState(false)
  
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const cameraInputRef = useRef<HTMLInputElement>(null)

//   useEffect(() => {
//     if (!isOpen) {
//       setImage(null)
//       setZoom(1)
//     }
//   }, [isOpen])

//   const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       const reader = new FileReader()
//       reader.onload = () => setImage(reader.result as string)
//       reader.readAsDataURL(file)
//     }
//   }

//   const handleSave = async () => {
//     if (!image || !croppedAreaPixels) return
//     setIsUploading(true)
//     try {
//       const croppedBlob = await getCroppedImg(image, croppedAreaPixels)
//       const fileName = `${crypto.randomUUID()}.jpg`
//       const filePath = `avatars/${fileName}`

//       const { error } = await supabase.storage
//         .from('avatars')
//         .upload(filePath, croppedBlob)

//       if (error) throw error

//       onUploadSuccess(fileName)
//       onClose()
//     } catch (error: any) {
//       toast.error("Помилка завантаження: " + error.message)
//     } finally {
//       setIsUploading(false)
//     }
//   }

//   if (!isOpen) return null

//   return (
//     <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
//       <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-[3rem] p-8 relative shadow-2xl">
//         <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
//           <X size={20}/>
//         </button>

//         <div className="text-center mb-8">
//           <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Редактор фото</h3>
//           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Оберіть джерело зображення</p>
//         </div>

//         <div className="relative w-full aspect-square bg-zinc-900/50 rounded-3xl overflow-hidden border border-zinc-800 mb-6">
//           {image ? (
//             <Cropper
//               image={image}
//               crop={crop}
//               zoom={zoom}
//               aspect={1}
//               onCropChange={setCrop}
//               onZoomChange={setZoom}
//               onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
//             />
//           ) : (
//             <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
//               <div className="grid grid-cols-2 gap-4 w-full">
//                 {/* ВАРІАНТ 1: ГАЛЕРЕЯ */}
//                 <button 
//                   type="button"
//                   onClick={() => fileInputRef.current?.click()}
//                   className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
//                 >
//                   <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
//                     <ImageIcon size={24} className="text-zinc-400 group-hover:text-primary" />
//                   </div>
//                   <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">Галерея</span>
//                 </button>

//                 {/* ВАРІАНТ 2: КАМЕРА */}
//                 <button 
//                   type="button"
//                   onClick={() => cameraInputRef.current?.click()}
//                   className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
//                 >
//                   <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
//                     <Camera size={24} className="text-zinc-400 group-hover:text-primary" />
//                   </div>
//                   <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white">Камера</span>
//                 </button>
//               </div>
//               <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-[0.2em]">Натисніть для вибору</p>
//             </div>
//           )}
//         </div>

//         {image && (
//           <div className="space-y-6">
//             <div className="flex items-center gap-4">
//                <Maximize2 size={14} className="text-zinc-600" />
//                <input 
//                 type="range" min={1} max={3} step={0.1} value={zoom}
//                 onChange={(e) => setZoom(Number(e.target.value))}
//                 className="w-full accent-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
//               />
//             </div>
            
//             <div className="grid grid-cols-2 gap-3">
//               <button 
//                 type="button"
//                 onClick={() => setImage(null)}
//                 className="py-4 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-zinc-800 transition-colors"
//               >
//                 Скасувати
//               </button>
//               <button 
//                 type="button"
//                 onClick={handleSave}
//                 disabled={isUploading}
//                 className="py-4 bg-primary text-black text-[10px] font-black uppercase rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(var(--primary-rgb),0.3)]"
//               >
//                 {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
//                 Підтвердити
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ПРИХОВАНІ ІНПУТИ */}
//         {/* Для галереї */}
//         <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
        
//         {/* Для камери (capture="environment" активує задню камеру на мобільних) */}
//         <input type="file" ref={cameraInputRef} onChange={onFileChange} accept="image/*" capture="environment" className="hidden" />
//       </div>
//     </div>
//   )
// }