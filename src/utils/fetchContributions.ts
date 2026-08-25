export interface ContributionDay {
	date: string
	level: 0 | 1 | 2 | 3 | 4
	count: number
	month: number
	isFuture: boolean
}

export type ContributionWeek = ContributionDay[]

export interface MonthStat {
	month: number
	count: number
	cumulativeCount: number
	firstCol: number
	lastCol: number
}

export interface ContributionsData {
	weeks: ContributionWeek[]
	totalCount: number
	username: string
	fetchedAt: string
	year: number
	currentMonth: number
	months: MonthStat[]
}

const currentYear = new Date().getFullYear()

const EMPTY: ContributionsData = {
	weeks: [],
	totalCount: 0,
	username: '',
	fetchedAt: new Date(0).toISOString(),
	year: currentYear,
	currentMonth: new Date().getMonth(),
	months: [],
}

const TTL = 60 * 60 * 1000

interface CacheEntry {
	data: ContributionsData
	timestamp: number
}

const cache = new Map<string, CacheEntry>()
const pendingCache = new Map<string, Promise<ContributionsData>>()

export function fetchContributions(username: string, targetYear = currentYear): Promise<ContributionsData> {
	const cacheKey = `${username}_${targetYear}`
	const entry = cache.get(cacheKey)
	if (entry && Date.now() - entry.timestamp < TTL) {
		return Promise.resolve(entry.data)
	}

	const pending = pendingCache.get(cacheKey)
	if (pending) return pending

	const fresh = load(username, targetYear).then(data => {
		cache.set(cacheKey, { data, timestamp: Date.now() })
		pendingCache.delete(cacheKey)
		return data
	})
	pendingCache.set(cacheKey, fresh)
	return fresh
}

async function load(username: string, year: number): Promise<ContributionsData> {
	try {
		const url = `https://github.com/users/${username}/contributions?from=${year}-01-01&to=${year}-12-31`
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (portfolio build)',
				Accept: 'text/html',
			},
			signal: AbortSignal.timeout(5000),
		})
		if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
		return parseContributions(await res.text(), username, year)
	} catch (err) {
		console.warn(`[fetchContributions] Failed for ${username}:`, err)
		return { ...EMPTY, username, year }
	}
}

function parseContributions(html: string, username: string, year: number): ContributionsData {
	const tooltipRegex = /<tool-tip[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/gi
	const tooltips = new Map<string, number>()
	let tooltipMatch: RegExpExecArray | null
	while (true) {
		tooltipMatch = tooltipRegex.exec(html)
		if (!tooltipMatch) break
		const forId = tooltipMatch[1]
		const text = tooltipMatch[2].trim()
		const countMatch = text.match(/^(\d[\d,]*)\s+contribution/i)
		const count = countMatch ? Number.parseInt(countMatch[1].replace(/,/g, ''), 10) : 0
		tooltips.set(forId, count)
	}

	const dayRegex = /<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g
	const levelRegex = /data-level="(\d)"/
	const dateRegex = /data-date="(\d{4}-\d{2}-\d{2})"/
	const idRegex = /contribution-day-component-(\d+)-(\d+)/
	const idAttrRegex = /id="([^"]+)"/

	let totalCount = 0
	const totalMatch = html.match(/(\d[\d,]*)\s+contributions?\s+in\s+(?:the\s+last\s+year|\d{4})/i)
	if (totalMatch) totalCount = Number(totalMatch[1].replace(/,/g, ''))

	const matches = html.match(dayRegex) ?? []
	const today = new Date()
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
	const currentMonth = today.getFullYear() === year ? today.getMonth() : 11

	if (!matches.length) {
		return {
			...EMPTY,
			username,
			year,
			currentMonth,
			fetchedAt: new Date().toISOString(),
		}
	}

	type Parsed = { col: number; row: number; day: ContributionDay }
	const parsed: Parsed[] = []
	let maxCol = 0

	const monthlyCounts = Array.from({ length: 12 }, () => 0)
	const monthlyFirstCol = Array.from({ length: 12 }, () => 999)
	const monthlyLastCol = Array.from({ length: 12 }, () => -1)

	for (const raw of matches) {
		const date = raw.match(dateRegex)?.[1]
		if (!date) continue
		const level = Number(raw.match(levelRegex)?.[1] ?? '0') as 0 | 1 | 2 | 3 | 4
		const idMatch = raw.match(idRegex)
		const row = idMatch ? Number(idMatch[1]) : new Date(date).getUTCDay()
		const col = idMatch ? Number(idMatch[2]) : 0
		const idAttr = raw.match(idAttrRegex)?.[1] ?? ''
		const count = tooltips.get(idAttr) ?? (level > 0 ? 1 : 0)
		const month = Number.parseInt(date.slice(5, 7), 10) - 1
		const isFuture = date > todayStr

		maxCol = Math.max(maxCol, col)

		if (month >= 0 && month < 12) {
			if (!isFuture) {
				monthlyCounts[month] += count
			}
			monthlyFirstCol[month] = Math.min(monthlyFirstCol[month], col)
			monthlyLastCol[month] = Math.max(monthlyLastCol[month], col)
		}

		parsed.push({
			col,
			row,
			day: {
				date,
				level,
				count,
				month,
				isFuture,
			},
		})
	}

	const weeks: ContributionWeek[] = Array.from({ length: maxCol + 1 }, () =>
		Array.from({ length: 7 }, () => ({
			date: '',
			level: 0 as const,
			count: 0,
			month: 0,
			isFuture: true,
		}))
	)

	for (const { col, row, day } of parsed) {
		if (row >= 0 && row < 7) weeks[col][row] = day
	}

	let runningCumulative = 0
	const months: MonthStat[] = Array.from({ length: 12 }, (_, m) => {
		const count = monthlyCounts[m]
		runningCumulative += count
		return {
			month: m,
			count,
			cumulativeCount: runningCumulative,
			firstCol: monthlyFirstCol[m] === 999 ? 0 : monthlyFirstCol[m],
			lastCol: monthlyLastCol[m] === -1 ? 0 : monthlyLastCol[m],
		}
	})

	// If totalMatch was not found or 0, fallback to computed cumulativeCount up to today
	if (totalCount === 0) {
		totalCount = runningCumulative
	}

	return {
		weeks,
		totalCount,
		username,
		fetchedAt: new Date().toISOString(),
		year,
		currentMonth,
		months,
	}
}
