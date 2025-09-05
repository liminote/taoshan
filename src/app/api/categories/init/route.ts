import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 預設分類資料
const defaultCategories = [
  {
    id: 1,
    name: '壽司刺身',
    subcategories: [
      '手卷/壽司（菜單）',
      '刺身/蓋飯（菜單）'
    ]
  },
  {
    id: 2,
    name: '黑板料理',
    subcategories: [
      '季節食材/黑板菜單',
      '炒物/黑板料理',
      '前菜沙拉/黑板料理',
      '烤物/黑板料理',
      '魚類',
      '單點刺身/壽司/黑板料理',
      '揚物/黑板料理',
      '湯品/黑板料理',
      '菜類',
      '蝦蟹類'
    ]
  },
  {
    id: 3,
    name: '烤炸串',
    subcategories: [
      '烤物/串燒（菜單）',
      '揚物（菜單）'
    ]
  },
  {
    id: 4,
    name: '配菜',
    subcategories: [
      '吸物/鍋物（菜單）',
      '前菜/酒餚（菜單）',
      '甜點',
      '無菜單料理'
    ]
  },
  {
    id: 5,
    name: '主食',
    subcategories: [
      '食事（菜單）',
      '商業定食（菜單）',
      '關東煮'
    ]
  },
  {
    id: 6,
    name: '酒水',
    subcategories: [
      '西洋酒',
      '東洋酒',
      '附贈飲料',
      '非酒精飲料',
      '啤酒'
    ]
  },
  {
    id: 7,
    name: '便當',
    subcategories: [
      '便當'
    ]
  },
  {
    id: 8,
    name: '外帶送',
    subcategories: [
      '外帶平台',
      'uber eat'
    ]
  },
  {
    id: 9,
    name: '其他',
    subcategories: [
      '加價購',
      '年菜',
      '折扣模組',
      '其他',
      '活動贈品',
      '振興券類',
      '現金禮券',
      '搭伙伴',
      '點數換贈品',
      '舊菜單',
      '備註事項',
      '折扣區'
    ]
  }
]

export async function POST() {
  try {
    console.log('🏗️ 開始初始化商品分類...')

    // 檢查是否已經有分類資料
    const { count: existingCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })

    if (existingCount && existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: '分類資料已存在',
        categoriesCount: existingCount
      })
    }

    // 插入主分類
    const categoriesToInsert = defaultCategories.map(cat => ({
      id: cat.id,
      name: cat.name
    }))

    const { error: categoriesError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)

    if (categoriesError) {
      console.error('插入主分類失敗:', categoriesError)
      return NextResponse.json({ error: '插入主分類失敗' }, { status: 500 })
    }

    // 插入子分類
    let totalSubcategories = 0
    for (const category of defaultCategories) {
      if (category.subcategories.length > 0) {
        const subcategoriesToInsert = category.subcategories.map(subName => ({
          category_id: category.id,
          name: subName
        }))

        const { error: subcategoriesError } = await supabase
          .from('subcategories')
          .insert(subcategoriesToInsert)

        if (subcategoriesError) {
          console.error(`插入分類 ${category.name} 的子分類失敗:`, subcategoriesError)
          return NextResponse.json({ error: `插入子分類失敗` }, { status: 500 })
        }

        totalSubcategories += subcategoriesToInsert.length
        console.log(`✅ 已插入分類「${category.name}」的 ${subcategoriesToInsert.length} 個子分類`)
      }
    }

    console.log(`✅ 初始化完成：${defaultCategories.length} 個主分類，${totalSubcategories} 個子分類`)

    return NextResponse.json({
      success: true,
      message: '分類初始化完成',
      categoriesCount: defaultCategories.length,
      subcategoriesCount: totalSubcategories
    })

  } catch (error) {
    console.error('初始化分類時發生錯誤:', error)
    return NextResponse.json({ error: '初始化失敗' }, { status: 500 })
  }
}