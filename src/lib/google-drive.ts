import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Readable } from 'stream'

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

export async function getGoogleDriveClient() {
    try {
        const credentials = JSON.parse(
            process.env.GOOGLE_SHEETS_CREDENTIALS || '{}'
        )

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        })

        const drive = google.drive({ version: 'v3', auth })
        return drive
    } catch (error) {
        console.error('Google Drive 認證失敗:', error)
        throw new Error('Google Drive API 初始化失敗')
    }
}

export function getServiceAccountEmail(): string {
    try {
        const credentials = JSON.parse(
            process.env.GOOGLE_SHEETS_CREDENTIALS || '{}'
        )
        return credentials.client_email || '未知'
    } catch (e) {
        return '未知'
    }
}

export async function findFolderId(folderName: string): Promise<string | null> {
    const drive = await getGoogleDriveClient()
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
    })

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id || null
    }
    return null
}

export async function listVideosInFolder(folderId: string) {
    const drive = await getGoogleDriveClient()
    // Search for MP4 files in the folder
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='video/mp4' and trashed=false`,
        fields: 'files(id, name, createdTime, size, mimeType)',
        orderBy: 'createdTime desc',
        pageSize: 20,
    })

    return res.data.files || []
}

export async function listFilesInFolder(folderId: string) {
    const drive = await getGoogleDriveClient()
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime, size, mimeType)',
        orderBy: 'createdTime desc',
        pageSize: 20,
    })

    return res.data.files || []
}

export async function downloadFileToTmp(fileId: string, fileName: string): Promise<string> {
    const drive = await getGoogleDriveClient()
    const tmpDir = os.tmpdir()
    const filePath = path.join(tmpDir, fileName)
    const dest = fs.createWriteStream(filePath)

    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    )

    return new Promise((resolve, reject) => {
        res.data
            .on('end', () => {
                resolve(filePath)
            })
            .on('error', (err) => {
                reject(err)
            })
            .pipe(dest)
    })
}
