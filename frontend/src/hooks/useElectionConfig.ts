import { useState, useEffect } from 'react'
import { electionData } from '../data/electionData'

export interface ConfigCandidate {
  id: string
  name: string
  party: string
  region: string
}
export interface ConfigPosition {
  id: string
  name: string
  maxSelections: number
  candidates: ConfigCandidate[]
}

const BACKEND_URL = 'http://localhost:3001'

// Fallback to the hardcoded ballot if the backend/config is unavailable.
const FALLBACK: ConfigPosition[] = [
  electionData.president,
  electionData.vice_president,
  electionData.senators,
].map(p => ({
  id: p.id,
  name: p.name,
  maxSelections: p.maxSelections,
  candidates: p.candidates.map(c => ({ id: c.id, name: c.name, party: c.party, region: c.region })),
}))

/**
 * Loads the ballot configuration (positions + candidates) from the backend,
 * falling back to the bundled defaults if the request fails.
 */
export function useElectionConfig() {
  const [positions, setPositions] = useState<ConfigPosition[]>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`${BACKEND_URL}/api/config`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d || !Array.isArray(d.positions) || d.positions.length === 0) return
        setPositions(d.positions as ConfigPosition[])
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const positionLabels: Record<string, string> = {}
  const candidateNames: Record<string, string> = {}
  positions.forEach(p => {
    positionLabels[p.id] = p.name
    p.candidates.forEach(c => {
      candidateNames[c.id] = c.name
    })
  })

  return { positions, positionLabels, candidateNames, loading }
}
