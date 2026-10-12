import type { Metadata } from 'next';
import './globals.css';
import { AnalyticsTracker } from '@/components/analytics-tracker';

export const metadata: Metadata = {
  title: 'Learnflow - AI 学习规划助手',
  description: 'AI 辅助的技术学习规划，帮助你系统化地完成职业转型',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-50 text-gray-900">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
