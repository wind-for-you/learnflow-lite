'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveCheckin, getCheckinForWeek } from '@/lib/utils/local-storage';
import { trackEvent } from '@/lib/analytics/client';

function CheckinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const weekIndex = parseInt(searchParams?.get('week') || '0');
  
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');
  const [hoursSpent, setHoursSpent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState(false);

  useEffect(() => {
    const existing = getCheckinForWeek(weekIndex);
    if (existing) {
      setSummary(existing.summary);
      setLink(existing.link);
      setHoursSpent(existing.hoursSpent.toString());
      setExistingCheckin(true);
    }
  }, [weekIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hours = parseFloat(hoursSpent);
    if (isNaN(hours) || hours < 0) {
      alert('请输入有效的小时数');
      return;
    }

    const checkinData = {
      weekIndex,
      summary,
      link,
      hoursSpent: hours,
      timestamp: Date.now(),
    };

    saveCheckin(checkinData);
    setSubmitted(true);

    if (!existingCheckin) {
      trackEvent('first_checkin', { weekIndex });
    }

    const confettiModule = await import('canvas-confetti');
    confettiModule.default({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      router.push('/plan');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">第 {weekIndex + 1} 周打卡</h1>
          <p className="text-gray-600 mb-6">
            记录你的学习成果，保持学习节奏 🎯
          </p>

          {submitted ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-success-600 mb-2">
                打卡成功！
              </h2>
              <p className="text-gray-600">继续保持，你做得很棒！</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  本周学习总结 *
                </label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="写下你的收获、遇到的问题、解决的思路..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  成果链接（可选）
                </label>
                <Input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://github.com/your-repo 或其他链接"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  实际投入小时数 *
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ 数据存储在本机浏览器，换设备或清除缓存会丢失
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  返回
                </Button>
                <Button type="submit" className="flex-1">
                  {existingCheckin ? '更新打卡' : '提交打卡'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <CheckinPageContent />
    </Suspense>
  );
}
