// 簡易 CSV 解析器，支援引號與跳脫處理
export function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let currentField = ''
  let currentRow: string[] = []
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    if (char === '\n') {
      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ''
      continue
    }

    currentField += char
  }

  // 收尾最後一個欄位
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
  }
  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  // 移除完全空白的行
  return rows.filter(row => row.some(value => value.trim() !== ''))
}
