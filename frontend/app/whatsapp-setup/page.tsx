"use client"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { MessageCircle, ExternalLink, CheckCircle2 } from "lucide-react"

export default function WhatsAppSetupPage() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "14155238886"
  const formattedNumber = `+1 (415) 523-8886`
  const sandboxKeyword = "join <sandbox-keyword>"

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <MessageCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Connect Pramanik WhatsApp Bot</h1>
          <p className="text-slate-400">Follow these 3 simple steps to start listing products directly from your phone.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Save the Number</h3>
                <p className="text-slate-400 text-sm mb-3">Save our official Twilio Sandbox number to your contacts as "Pramanik".</p>
                <div className="font-mono text-xl text-blue-400 bg-slate-900 px-4 py-2 rounded-lg inline-block">
                  {formattedNumber}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Join the Sandbox</h3>
                <p className="text-slate-400 text-sm mb-3">Send the secret keyword to activate the bot for your number.</p>
                <div className="font-mono text-lg text-green-400 bg-slate-900 px-4 py-2 rounded-lg inline-block">
                  {sandboxKeyword}
                </div>
                <p className="text-xs text-slate-500 mt-2">* The exact keyword depends on your Twilio account setup.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold shrink-0">3</div>
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-1">Start Listing</h3>
                <p className="text-slate-400 text-sm mb-4">Once connected, just send the word "NEW" to start a product listing.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full bg-green-600 hover:bg-green-500 text-white h-12 rounded-xl font-semibold">
                      <MessageCircle className="w-5 h-5 mr-2" /> Open WhatsApp
                    </Button>
                  </a>
                  <div className="flex-1 flex justify-center py-2">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://wa.me/${whatsappNumber}`} alt="WhatsApp QR" className="rounded-xl border-4 border-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
