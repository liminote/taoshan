import { NextRequest, NextResponse } from 'next/server'
import { findFolderId, listVideosInFolder, getServiceAccountEmail } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
    try {
        // 1. Find "Meet Recordings" folder
        const folderName = 'Meet Recordings'
        const folderId = await findFolderId(folderName)

        if (!folderId) {
            const email = getServiceAccountEmail()
            return NextResponse.json(
                {
                    error: `找不到資料夾 "${folderName}"。請確認：\n1. Google Drive 中是否有此資料夾\n2. 是否已將該資料夾分享給服務帳號：${email}`
                },
                { status: 404 }
            )
        }

        // 2. List videos
        const files = await listVideosInFolder(folderId)

        if (files.length === 0) {
            return NextResponse.json({
                files: [],
                message: `找到資料夾 "${folderName}"，但其中沒有 MP4 影片。請確認影片格式是否正確。`
            })
        }

        return NextResponse.json({ files })
    } catch (error: any) {
        console.error('List videos error:', error)
        return NextResponse.json(
            { error: `讀取影片列表失敗: ${error.message}` },
            { status: 500 }
        )
    }
}
