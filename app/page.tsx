import Link from 'next/link';
import { SampleWeekCard } from '@/components/sample-week-card';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center space-y-8">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 animate-fade-in">
              <span className="block">AI 学习规划助手</span>
              <span className="block mt-2 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                技术自学转行
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto animate-slide-up text-balance">
              回答 5 个问题，得到按周拆分的转行计划：
              <span className="font-medium text-gray-900">每周一个可交付的作品、2–3 条完成标准和预计小时数</span>，
              做完提交链接打卡。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center sm:items-start animate-scale-in">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                开始规划
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              <div className="flex flex-col items-center gap-1 sm:items-start">
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-gray-300 bg-white font-medium hover:bg-gray-50 transition-colors"
                >
                  查看演示
                </a>
                <span className="text-sm text-gray-600">先看一周计划长什么样，无需注册</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="scroll-mt-4 py-12 px-4 sm:px-6 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">生成的计划长这样</h2>
          <p className="text-center text-gray-600 mb-8">每一周都能检查是否完成，而不是一串“学习主题”。</p>
          <SampleWeekCard />
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          <p>© 2026 Learnflow. 让学习更有计划。</p>
        </div>
      </footer>
    </main>
  );
}
