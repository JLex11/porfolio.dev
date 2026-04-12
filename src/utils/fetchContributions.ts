export interface ContributionDay {
  date: string
  level: 0 | 1 | 2 | 3 | 4
}

export type ContributionWeek = ContributionDay[]

export interface ContributionsData {
  weeks: ContributionWeek[]
  totalCount: number
  username: string
  fetchedAt: string
}

const EMPTY: ContributionsData = {
  weeks: [],
  totalCount: 0,
  username: '',
  fetchedAt: new Date(0).toISOString(),
}

const cache = new Map<string, Promise<ContributionsData>>()

export function fetchContributions(username: string): Promise<ContributionsData> {
  const cached = cache.get(username)
  if (cached) return cached
  const pending = load(username)
  cache.set(username, pending)
  return pending
}

async function load(username: string): Promise<ContributionsData> {
  try {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (portfolio build)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
    return parseContributions(await res.text(), username)
  } catch (err) {
    console.warn(`[fetchContributions] Failed for ${username}:`, err)
    return { ...EMPTY, username }
  }
}

function parseContributions(html: string, username: string): ContributionsData {
  const cleaned = html.replace(/<tool-tip[^>]*>[\s\S]*?<\/tool-tip>/g, '')

  const dayRegex = /<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g
  const levelRegex = /data-level="(\d)"/
  const dateRegex = /data-date="(\d{4}-\d{2}-\d{2})"/
  const idRegex = /contribution-day-component-(\d+)-(\d+)/

  let totalCount = 0
  const totalMatch = cleaned.match(/(\d[\d,]*)\s+contributions?\s+in\s+the\s+last\s+year/i)
  if (totalMatch) totalCount = Number(totalMatch[1].replace(/,/g, ''))

  const matches = cleaned.match(dayRegex) ?? []
  if (!matches.length) {
    return { ...EMPTY, username, fetchedAt: new Date().toISOString() }
  }

  type Parsed = { col: number; row: number; day: ContributionDay }
  const parsed: Parsed[] = []
  let maxCol = 0

  for (const raw of matches) {
    const date = raw.match(dateRegex)?.[1]
    if (!date) continue
    const level = Number(raw.match(levelRegex)?.[1] ?? '0') as 0 | 1 | 2 | 3 | 4
    const idMatch = raw.match(idRegex)
    const row = idMatch ? Number(idMatch[1]) : new Date(date).getUTCDay()
    const col = idMatch ? Number(idMatch[2]) : 0
    maxCol = Math.max(maxCol, col)
    parsed.push({ col, row, day: { date, level } })
  }

  const weeks: ContributionWeek[] = Array.from({ length: maxCol + 1 }, () =>
    Array.from({ length: 7 }, () => ({ date: '', level: 0 as const }))
  )
  for (const { col, row, day } of parsed) {
    if (row >= 0 && row < 7) weeks[col][row] = day
  }

  return {
    weeks,
    totalCount,
    username,
    fetchedAt: new Date().toISOString(),
  }
}
