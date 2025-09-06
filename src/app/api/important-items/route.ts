import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface ImportantItem {
  id: string
  date: string
  content: string
  assignee: string
  completed: boolean
  completedAt?: string
  createdAt: string
}

const DATA_FILE = path.join(process.cwd(), 'src/data/important-items.json')

const loadImportantItems = (): ImportantItem[] => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('載入重要事項資料失敗:', error)
  }
  return []
}

const saveImportantItems = (items: ImportantItem[]): void => {
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8')
  } catch (error) {
    console.error('儲存重要事項資料失敗:', error)
  }
}

export async function GET() {
  try {
    const importantItems = loadImportantItems()
    return NextResponse.json({
      success: true,
      data: importantItems
    })
  } catch (error) {
    console.error('獲取重要事項失敗:', error)
    return NextResponse.json({ error: '獲取重要事項失敗' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json()
    const importantItems = loadImportantItems()
    
    if (action === 'add') {
      const { date, content, assignee } = data
      
      if (!date || !content || !assignee) {
        return NextResponse.json({ error: '日期、內容和負責人為必填' }, { status: 400 })
      }
      
      const newItem: ImportantItem = {
        id: Date.now().toString(),
        date,
        content,
        assignee,
        completed: false,
        createdAt: new Date().toISOString()
      }
      
      importantItems.push(newItem)
      saveImportantItems(importantItems)
      
      return NextResponse.json({
        success: true,
        message: '重要事項已新增',
        data: newItem
      })
      
    } else if (action === 'update') {
      const { id, date, content, assignee } = data
      
      const itemIndex = importantItems.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }
      
      importantItems[itemIndex] = {
        ...importantItems[itemIndex],
        date: date || importantItems[itemIndex].date,
        content: content || importantItems[itemIndex].content,
        assignee: assignee || importantItems[itemIndex].assignee
      }
      
      saveImportantItems(importantItems)
      
      return NextResponse.json({
        success: true,
        message: '重要事項已更新',
        data: importantItems[itemIndex]
      })
      
    } else if (action === 'toggle') {
      const { id } = data
      
      const itemIndex = importantItems.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }
      
      const item = importantItems[itemIndex]
      item.completed = !item.completed
      
      if (item.completed) {
        item.completedAt = new Date().toISOString()
      } else {
        delete item.completedAt
      }
      
      saveImportantItems(importantItems)
      
      return NextResponse.json({
        success: true,
        message: item.completed ? '事項已完成' : '事項已標記為未完成',
        data: item
      })
      
    } else if (action === 'delete') {
      const { id } = data
      
      const itemIndex = importantItems.findIndex(item => item.id === id)
      if (itemIndex === -1) {
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }
      
      const deletedItem = importantItems.splice(itemIndex, 1)[0]
      saveImportantItems(importantItems)
      
      return NextResponse.json({
        success: true,
        message: '重要事項已刪除',
        data: deletedItem
      })
    }
    
    return NextResponse.json({ error: '無效的操作類型' }, { status: 400 })
    
  } catch (error) {
    console.error('處理重要事項時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}