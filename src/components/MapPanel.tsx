import { useEffect } from 'react'
import { MAP_ROOMS, ROOMS } from '../game/rooms'
import type { IslandPresence } from '../game/useIsland'

interface Props {
  current: string
  online: Record<string, IslandPresence>
  onTravel: (room: string) => void
  onGoHome: () => void
  onClose: () => void
}

export function MapPanel({ current, online, onTravel, onGoHome, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const counts: Record<string, number> = {}
  for (const p of Object.values(online)) {
    counts[p.room] = (counts[p.room] ?? 0) + 1
  }

  return (
    <div className="overlay" onPointerDown={onClose}>
      <div className="map-panel" onPointerDown={(e) => e.stopPropagation()}>
        <header className="card-head">
          <h2>Island Map</h2>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="map-grid">
          {MAP_ROOMS.map(({ id, blurb }) => {
            const here = counts[id] ?? 0
            return (
              <button
                key={id}
                className={current === id ? 'map-tile current' : 'map-tile'}
                onClick={() => onTravel(id)}
              >
                <span className="map-tile-name">{ROOMS[id].name}</span>
                <span className="map-tile-blurb">{blurb}</span>
                <span className={here ? 'map-tile-count busy' : 'map-tile-count'}>
                  {here === 0 ? 'empty' : here === 1 ? '1 penguin' : `${here} penguins`}
                </span>
              </button>
            )
          })}

          <button className="map-tile home" onClick={onGoHome}>
            <span className="map-tile-name">Your Igloo</span>
            <span className="map-tile-blurb">Decorate it, invite friends over</span>
            <span className="map-tile-count">home</span>
          </button>
        </div>
      </div>
    </div>
  )
}
