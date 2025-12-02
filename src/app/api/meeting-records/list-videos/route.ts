
import { NextRequest, NextResponse } from 'next/server'
import { findFolderId, listMediaInFolder, listFilesInFolder, getServiceAccountEmail } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
    try {
        // 1. Find "Meet Recordings" folder
        const folderName = 'Meet Recordings'
        const folderId = await findFolderId(folderName)

        if (!folderId) {
            const email = getServiceAccountEmail()
            return NextResponse.json(
                {
                    error: `找不到資料夾 "${folderName}"。請確認：\n1.Google Drive 中是否有此資料夾\n2.是否已將該資料夾分享給服務帳號：${email} `
                },
                { status: 404 }
            )
        }

        // 2. List videos and audio
        const files = await listMediaInFolder(folderId)

        if (files.length === 0) {
            // Debug: check if there are ANY files
            const allFiles = await listFilesInFolder(folderId)
            let message = ''

            if (allFiles.length > 0) {
                const types = Array.from(new Set(allFiles.map(f => f.mimeType))).join(', ')
                const names = allFiles.slice(0, 3).map(f => f.name).join(', ')
                message = `找到資料夾 "${folderName}"，但其中沒有 MP4 影片。發現 ${allFiles.length} 個其他檔案(類型: ${types})，例如: ${names}。請確認影片是否為 MP4 格式。`
            } else {
                const email = getServiceAccountEmail()
                message = `找到資料夾 "${folderName}"(ID: ${folderId})，但裡面是空的。請確認：\n1.檔案是否已上傳\n2.服務帳號(${email}) 是否有權限讀取檔案`
            }

            return NextResponse.json({
                files: [],
                message
            })
        }

        return NextResponse.json({ files })
    } catch (error: any) {
        console.error('List videos error:', error)
        return NextResponse.json(
            { error: `讀取影片列表失敗: ${error.message} ` },
            { status: 500 }
        )
    }
}
