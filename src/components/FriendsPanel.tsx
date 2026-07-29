import { useEffect, useRef } from 'react'
import type { FriendSummary } from '../lib/types'
import type { IslandPresence } from '../game/useIsland'
import { drawPenguinPreview } from '../game/render'

interface Props {
  friends: FriendSummary[]
  requests: FriendSummary[]
  online: Record<string, IslandPresence>
  busy: boolean
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onRemove: (id: string) => void
  onGoTo: (room: string) => void
  onVisitIgloo: (friend: FriendSummary) => void
  onClose: () => void
}

function FriendAvatar({ friend }: { friend: FriendSummary }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    const frame = (now: number) => {
      if (ref.current) {
        drawPenguinPreview(ref.current, { color: friend.color, equipped: friend.equipped }, now, 0.72)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [friend])
  return <canvas ref={ref} className="friend-avatar" />
}

export function FriendsPanel({
  friends,
  requests,
  online,
  busy,
  onAccept,
  onDecline,
  onRemove,
  onGoTo,
  onVisitIgloo,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onPointerDown={onClose}>
      <div className="side-panel" onPointerDown={(e) => e.stopPropagation()}>
        <header className="card-head">
          <h2>Friends</h2>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="panel-body">
          {requests.length > 0 && (
            <section>
              <h4>Friend requests</h4>
              <ul className="friend-list">
                {requests.map((r) => (
                  <li key={r.id}>
                    <FriendAvatar friend={r} />
                    <div className="friend-meta">
                      <strong>{r.username}</strong>
                      <span className="muted small">wants to be friends</span>
                    </div>
                    <div className="friend-buttons">
                      <button className="btn primary tiny" disabled={busy} onClick={() => onAccept(r.id)}>
                        Accept
                      </button>
                      <button className="btn ghost dark tiny" disabled={busy} onClick={() => onDecline(r.id)}>
                        No
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4>
              Your friends <span className="muted small">({friends.length})</span>
            </h4>
            {friends.length === 0 ? (
              <p className="muted small">
                Click another penguin in a room to open their card and add them.
              </p>
            ) : (
              <ul className="friend-list">
                {friends.map((f) => {
                  const here = online[f.id]
                  return (
                    <li key={f.id}>
                      <FriendAvatar friend={f} />
                      <div className="friend-meta">
                        <strong>{f.username}</strong>
                        <span className={here ? 'muted small online-tag' : 'muted small'}>
                          {here ? `in ${here.roomName}` : 'offline'}
                        </span>
                      </div>
                      <div className="friend-buttons">
                        {here && (
                          <button className="btn primary tiny" onClick={() => onGoTo(here.room)}>
                            Join
                          </button>
                        )}
                        <button className="btn ghost dark tiny" onClick={() => onVisitIgloo(f)}>
                          Igloo
                        </button>
                        <button
                          className="btn ghost dark tiny"
                          disabled={busy}
                          onClick={() => onRemove(f.id)}
                          title="Remove friend"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
