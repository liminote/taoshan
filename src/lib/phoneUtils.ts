/**
 * 正規化電話號碼，移除開頭的 0 以及非數字字元
 * 用於統一不同來源的電話號碼格式，避免重複建立客戶
 */
export function normalizePhone(phone: string | number | undefined | null): string {
    if (phone === undefined || phone === null) return ''

    // 轉為字串並移除前後空白
    let phoneStr = phone.toString().trim()

    // 如果是 '--' 或空值則回傳空字串
    if (phoneStr === '' || phoneStr === '--') return ''

    // 移除所有非數字字元 (例如: -, ( ), 空格)
    phoneStr = phoneStr.replace(/\D/g, '')

    // 移除開頭的所有 0
    return phoneStr.replace(/^0+/, '')
}
