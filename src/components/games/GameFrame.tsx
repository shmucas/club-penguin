import { useEffect, useRef, type ReactNode } from 'react'

export const GAME_W = 760
export const GAME_H = 520

export type GamePhase = 'intro' | 'playing' | 'over'

/**
 * Keeps a canvas's backing store matched to its CSS size and device pixel
 * ratio, and hands back a context already scaled to GAME_W x GAME_H.
 */
export function useGameCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(GAME_W * dpr)
      canvas.height = Math.round(GAME_H * dpr)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [canvasRef])
}

export function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const scale = canvas.width / GAME_W
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  return ctx
}

/** Pointer position in game coordinates. */
export function pointerPos(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
  const r = canvas.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) / r.width) * GAME_W,
    y: ((e.clientY - r.top) / r.height) * GAME_H,
  }
}

interface Props {
  title: string
  howTo: string
  phase: GamePhase
  score: number
  coinsAwarded: number | null
  awardError: string | null
  onStart: () => void
  onExit: () => void
  children: ReactNode
}

export function GameFrame({
  title,
  howTo,
  phase,
  score,
  coinsAwarded,
  awardError,
  onStart,
  onExit,
  children,
}: Props) {
  const startRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (phase !== 'playing') startRef.current?.focus()
  }, [phase])

  return (
    <div className="overlay">
      <div className="game-panel">
        <header className="game-head">
          <h2>{title}</h2>
          <div className="game-head-right">
            <span className="score-chip">Score {score}</span>
            <button className="btn ghost" onClick={onExit}>
              Leave
            </button>
          </div>
        </header>

        <div className="game-stage">
          {children}

          {phase !== 'playing' && (
            <div className="game-veil">
              {phase === 'intro' ? (
                <>
                  <h3>{title}</h3>
                  <p>{howTo}</p>
                  <button ref={startRef} className="btn primary big" onClick={onStart}>
                    Play
                  </button>
                </>
              ) : (
                <>
                  <h3>Nice run!</h3>
                  <p className="final-score">{score} points</p>
                  {coinsAwarded !== null && <p className="coin-line">+{score} coins banked</p>}
                  {awardError && <p className="error-line">{awardError}</p>}
                  <div className="veil-buttons">
                    <button ref={startRef} className="btn primary" onClick={onStart}>
                      Play again
                    </button>
                    <button className="btn ghost" onClick={onExit}>
                      Back to the island
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
