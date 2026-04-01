import { countryToFlag } from '@/lib/qr-utils'
import { ExternalLink } from 'lucide-react'

export function JourneyTimelineRow({ scan, isLast }: { scan: any; isLast: boolean }) {
  const isMachine = scan.scanSource === 'MACHINE'
  const date = scan.serverTimestamp ? new Date(scan.serverTimestamp) : new Date(0)

  return (
    <div className="flex gap-3">
      {/* Connector */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
          ${isMachine ? 'bg-amber-500 text-black' :
            scan.anchoredOnChain ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
          {scan.scanNumber}
        </div>
        {!isLast && <div className="w-px flex-1 bg-zinc-800 mt-0.5 mb-0.5 min-h-[12px]" />}
      </div>

      {/* Content */}
      <div className={`${isLast ? 'pb-0' : 'pb-3'} flex-1 min-w-0`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-white truncate">
            {scan.resolvedLocation || 'Unknown location'}
          </span>
          {scan.ipCountry && <span className="text-sm">{countryToFlag(scan.ipCountry)}</span>}
          {isMachine && (
            <span className="text-[10px] bg-amber-900/50 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">
              🏭 {scan.machineModel || 'Scanner'}
            </span>
          )}
          {scan.anchoredOnChain && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${scan.anchorTxId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.5 rounded-full hover:bg-emerald-900 flex items-center gap-0.5"
            >
              ⛓️ Stellar <ExternalLink className="w-2 h-2" />
            </a>
          )}
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5">
          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          {scan.deviceType && !isMachine && ` · ${scan.deviceType}`}
        </div>
      </div>
    </div>
  )
}
