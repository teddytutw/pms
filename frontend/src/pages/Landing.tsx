import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="mb-6 flex justify-center">
          {/* 加入一個簡單的裝飾性圖標 */}
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 tracking-tight">
          PMS 專案管理系統
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          歡迎來到新世代的專案管理平台。專為現代化團隊設計，結合敏捷看板、任務追蹤與跨部門協作，讓您的專案交付更迅速、更透明。
        </p>
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          開始使用 🚀
        </button>
      </div>
    </div>
  );
}
