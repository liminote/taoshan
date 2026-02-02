import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'
import fs from 'fs'
import path from 'path'

const SKILL_DIR = path.join(process.cwd(), 'skills', 'reward_cards')

export async function GET() {
    try {
        if (!fs.existsSync(SKILL_DIR)) {
            return NextResponse.json({ success: true, cards: [], points: [] })
        }

        const files = fs.readdirSync(SKILL_DIR)

        const cardData: any[] = []
        const rawPointData: any[] = []

        for (const file of files) {
            if (!file.endsWith('.csv')) continue

            const filePath = path.join(SKILL_DIR, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const rows = parseCsv(content)

            if (rows.length < 2) continue

            const headers = rows[0].map(h => h.trim())
            const dataRows = rows.slice(1)

            // Extract date from filename rewardcards_stats_xxx_YYYYMMDD.csv
            const dateMatch = file.match(/(\d{8})/)
            const dateStr = dateMatch ? dateMatch[0] : ''
            const formattedDate = dateStr ? `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}` : 'Unknown'

            if (file.includes('_cards_')) {
                dataRows.forEach(row => {
                    const record: any = { date: formattedDate, originalFile: file }
                    headers.forEach((header, index) => {
                        record[header] = row[index] || ''
                    })
                    cardData.push(record)
                })
            } else if (file.includes('_points_')) {
                const pointMap: { [key: string]: string } = { date: formattedDate }
                dataRows.forEach(row => {
                    const point = row[headers.indexOf('point')]
                    const users = row[headers.indexOf('users')]
                    if (point !== undefined && users !== undefined) {
                        pointMap[`p${point}`] = users
                    }
                })
                rawPointData.push(pointMap)
            }
        }

        // Sort Card Data: newest date first
        cardData.sort((a, b) => b.date.localeCompare(a.date))

        // Sort Point Data: newest date first
        rawPointData.sort((a, b) => b.date.localeCompare(a.date))

        return NextResponse.json({
            success: true,
            cardHistory: cardData,
            pointHistory: rawPointData
        })

    } catch (error) {
        console.error('Error fetching reward card stats:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
