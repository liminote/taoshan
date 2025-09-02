import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            餐廳管理系統
          </h1>
          
          <div className="space-y-4">
            <Link 
              href="/reports" 
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              報表管理
            </Link>
            
            <Link 
              href="/upload" 
              className="block w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              資料上傳
            </Link>
            
            <div className="mt-8 p-4 bg-gray-100 rounded-md">
              <h2 className="text-lg font-semibold mb-2">重要事項</h2>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md" 
                rows={3}
                placeholder="輸入今天的重要事項..."
              />
              <div className="text-sm text-gray-500 mt-2">
                {new Date().toLocaleDateString('zh-TW')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
