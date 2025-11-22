import { NextRequest, NextResponse } from 'next/server'
import { findFolderId, listVideosInFolder } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
    try {
        // 1. Find "Meet Recordings" folder
        // You might want to make this configurable or allow passing a folder ID
        const folderName = 'Meet Recordings'
        const folderId = await findFolderId(folderName)

        if (!folderId) {
            return NextResponse.json(
                { error: `找不到資料夾: ${folderName}` },
                { status: 404 }
            )
        }

        // 2. List videos
        const files = await listVideosInFolder(folderId)

        return NextResponse.json({ files })
    } catch (error) {
        console.error('List videos error:', error)
        return NextResponse.json(
            { error: '無法讀取影片列表' },
            { status: 500 }
        )
    }
}
