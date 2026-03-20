import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, X } from 'lucide-react'

interface DisputeFormModalProps {
  onClose: () => void
  onSubmit: () => void
  disputeReason: string
  setDisputeReason: (val: string) => void
  disputeFile: File | null
  setDisputeFile: (file: File | null) => void
  uploading: boolean
  timeRemaining?: string | null
}

export function DisputeFormModal({
  onClose,
  onSubmit,
  disputeReason,
  setDisputeReason,
  disputeFile,
  setDisputeFile,
  uploading,
  timeRemaining
}: DisputeFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0D1A2D]">
          <h3 className="font-semibold text-white">Report an Issue</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {timeRemaining && (
            <div className="text-xs text-amber-400 font-medium bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-900 overflow-hidden">
              ⏳ {timeRemaining} remaining to submit proof
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              What's wrong with the package? <span className="text-red-400">*</span>
            </label>
            <Textarea 
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. The item is damaged, missing parts, or doesn't match the description..."
              className="bg-black/40 border-zinc-800 text-sm h-24 placeholder:text-zinc-600 resize-none focus-visible:ring-amber-500"
              maxLength={500}
            />
            <div className="text-right text-[10px] text-zinc-500 mt-1">
              {disputeReason.length}/500
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Upload Photo/Video Evidence <span className="text-red-400">*</span>
            </label>
            <label className={`
              flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${disputeFile ? 'border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
            `}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                {disputeFile ? (
                  <>
                    <Upload className="w-6 h-6 mb-2 text-amber-500" />
                    <p className="text-sm text-zinc-300 font-medium truncate max-w-[200px]">{disputeFile.name}</p>
                    <p className="text-xs text-amber-500 mt-1">Click to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2 text-zinc-500" />
                    <p className="text-sm text-zinc-400"><span className="font-semibold text-white">Click to upload</span></p>
                    <p className="text-[10px] text-zinc-500 mt-1">Max 10MB. JPG, PNG, or MP4.</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,video/mp4" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setDisputeFile(e.target.files[0])
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="flex-1 border border-zinc-700 hover:bg-zinc-800"
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={!disputeFile || disputeReason.trim().length < 5 || uploading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Submit Evidence'}
          </Button>
        </div>

      </div>
    </div>
  )
}
