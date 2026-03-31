'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'

interface Scan {
  scanNumber: number
  serverTimestamp: string
  resolvedLat: number | null
  resolvedLng: number | null
  resolvedLocation: string | null
  ipCountry: string | null
  deviceType: string | null
  scanSource: string
  scannerRole: string | null
  anchoredOnChain: boolean
  anchorTxId: string | null
  machineModel: string | null
  ipIsProxy: boolean | null
  os?: string | null
  ipCountryName?: string | null
}

interface JourneyMapProps {
  scans: Scan[]
}

export default function JourneyMap({ scans }: JourneyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const isInitializing = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || isInitializing.current) return

    // Filter to scans that have valid numeric coordinates
    const validScans = scans.filter(s => 
      typeof s.resolvedLat === 'number' && 
      typeof s.resolvedLng === 'number' && 
      !isNaN(s.resolvedLat) && 
      !isNaN(s.resolvedLng)
    )

    if (validScans.length === 0) return

    isInitializing.current = true

    // Dynamically import Leaflet (browser only)
    import('leaflet').then(L => {
      isInitializing.current = false
      if (!mapRef.current || leafletMap.current) return

      // Extra safeguard for React strict mode fast re-renders
      if ((mapRef.current as any)._leaflet_id) {
         (mapRef.current as any)._leaflet_id = null;
      }
      // Inject Leaflet CSS once
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Fix default marker icon path (common Next.js issue)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const coords = validScans.map(s => [s.resolvedLat!, s.resolvedLng!] as [number, number])

      // Centre map on midpoint of journey
      const avgLat = coords.reduce((a, c) => a + c[0], 0) / coords.length
      const avgLng = coords.reduce((a, c) => a + c[1], 0) / coords.length

      const map = L.map(mapRef.current!, {
        center: [avgLat, avgLng],
        zoom: coords.length === 1 ? 8 : 4,
        zoomControl: true,
        scrollWheelZoom: true,
      })
      leafletMap.current = map

      // Dark theme map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Route polyline connecting all scan points in order (Solid Bright Blue)
      if (coords.length > 1) {
        L.polyline(coords, {
          color: '#3B82F6',    // bright blue
          weight: 4,
          opacity: 0.8,
        }).addTo(map)
      }

      // Add a marker for each scan
      validScans.forEach((scan, index) => {
        const isFirst = index === 0
        const isLast = index === validScans.length - 1
        const isMachine = scan.scanSource === 'MACHINE'
        const isAnchored = scan.anchoredOnChain

        // Colour logic: green=origin, gold=final, amber=machine, blue=browser, red=proxy
        let markerColor = '#3B82F6'      // blue — browser scan
        if (scan.ipIsProxy) markerColor = '#EF4444'         // red
        else if (isMachine) markerColor = '#F59E0B'         // amber — machine/warehouse
        else if (isFirst) markerColor = '#10B981'           // green — origin
        else if (isLast) markerColor = '#F59E0B'            // gold — final (buyer)

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: 32px; height: 32px;
              background: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              font-size: 13px; font-weight: bold; color: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            ">${scan.scanNumber}</div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const date = new Date(scan.serverTimestamp).toLocaleString()
        const deviceLabel = isMachine
          ? `🏭 ${scan.machineModel || 'Machine Scanner'}`
          : `📱 ${scan.deviceType || 'Browser'} / ${scan.os || 'OS'}`
        const ipLabel = scan.ipCountryName ? `🌐 ${scan.ipCountryName}` : ''
        const anchorBadge = isAnchored
          ? `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #eee;"><a href="https://stellar.expert/explorer/testnet/tx/${scan.anchorTxId}" target="_blank" style="color:#10B981;font-size:11px;text-decoration:none;font-weight:bold;">⛓️ Verified on Stellar Blockchain</a></div>`
          : ''

        const popup = `
          <div style="font-family:sans-serif; min-width:220px; padding: 4px;">
            <div style="font-weight:bold; font-size:14px; margin-bottom:6px; color: #111827;">
              Checkpoint #${scan.scanNumber}
            </div>
            <div style="font-size:13px; color:#374151; font-weight: 500; margin-bottom:4px;">
              ${scan.resolvedLocation || `${scan.ipCountry || 'Unknown Transit Hub'}`}
            </div>
            <div style="font-size:11px; color:#6B7280; line-height: 1.5; margin-top:6px;">
              <strong>Time:</strong> ${date}<br/>
              <strong>Device:</strong> ${deviceLabel}<br/>
              ${ipLabel ? `<strong>Region:</strong> ${ipLabel}<br/>` : ''}
              ${anchorBadge}
            </div>
          </div>
        `

        L.marker([scan.resolvedLat!, scan.resolvedLng!], { icon })
          .addTo(map)
          .bindPopup(popup)
      })

      // Fit map to show all markers
      if (coords.length > 1) {
        map.fitBounds(L.latLngBounds(coords), { padding: [50, 50] })
      }
    })

    // Listen for Escape key and native fullscreen exit events
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      setTimeout(() => leafletMap.current?.invalidateSize(), 200)
    }
    document.addEventListener('fullscreenchange', handleFsChange)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      isInitializing.current = false
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [scans])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.log('Fullscreen error:', err)
      // Fallback if browser blocks it:
      setIsFullscreen(!isFullscreen)
      setTimeout(() => leafletMap.current?.invalidateSize(), 200)
    }
  }

  return (
    <div 
      ref={containerRef}
      className={isFullscreen 
        ? "w-screen h-screen bg-[#111827] flex flex-col fixed inset-0 z-[9999]" 
        : "w-full h-80 rounded-2xl overflow-hidden border border-zinc-800 z-0 relative flex flex-col bg-[#111827]"}
    >
      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-[400] bg-[#0C0F17]/80 hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.1] text-slate-300 p-2.5 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center"
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>
      <div ref={mapRef} className="flex-1 w-full z-0 h-full" />
    </div>
  )
}
