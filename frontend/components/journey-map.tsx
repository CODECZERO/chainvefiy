'use client'

import { useEffect, useRef } from 'react'

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
}

interface JourneyMapProps {
  scans: Scan[]
}

export default function JourneyMap({ scans }: JourneyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    // Filter to scans that have coordinates
    const validScans = scans.filter(s => s.resolvedLat !== null && s.resolvedLng !== null)
    if (validScans.length === 0) return

    // Dynamically import Leaflet (browser only)
    import('leaflet').then(L => {
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
        zoom: coords.length === 1 ? 8 : 3,
        zoomControl: true,
        scrollWheelZoom: false,
      })
      leafletMap.current = map

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Route polyline connecting all scan points in order
      if (coords.length > 1) {
        L.polyline(coords, {
          color: '#F59E0B',    // amber — matches Pramanik brand
          weight: 2.5,
          opacity: 0.8,
          dashArray: '6, 6',  // dashed to indicate a journey, not a solid path
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
              width: 28px; height: 28px;
              background: ${markerColor};
              border: 2px solid white;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              font-size: 11px; font-weight: bold; color: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            ">${scan.scanNumber}</div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const date = new Date(scan.serverTimestamp).toLocaleString()
        const deviceLabel = isMachine
          ? `🏭 ${scan.machineModel || 'Machine Scanner'}`
          : `📱 ${scan.deviceType || 'Browser'}`
        const anchorBadge = isAnchored
          ? `<br/><a href="https://stellar.expert/explorer/testnet/tx/${scan.anchorTxId}" target="_blank" style="color:#10B981;font-size:10px;">⛓️ Verified on Stellar</a>`
          : ''

        const popup = `
          <div style="font-family:sans-serif; min-width:180px;">
            <div style="font-weight:600; margin-bottom:4px; color: black;">
              Scan #${scan.scanNumber}
            </div>
            <div style="font-size:12px; color:#666;">
              ${scan.resolvedLocation || `${scan.ipCountry || 'Unknown'}`}
            </div>
            <div style="font-size:11px; color:#888; margin-top:4px;">
              ${date}<br/>
              ${deviceLabel}
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
        map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
      }
    })

    // Cleanup on unmount
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [scans])

  return (
    <div
      ref={mapRef}
      className="w-full h-80 rounded-2xl overflow-hidden border border-zinc-800 z-0"
      style={{ background: '#111827' }}
    />
  )
}
