'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feedback }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setEmail('');
          setFeedback('');
        }, 2000);
      } else {
        alert('提交失败，请稍后重试');
      }
    } catch {
      alert('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        💬 反馈
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <h3 id="feedback-title" className="text-xl font-bold mb-4">留下你的反馈</h3>
            
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-success-600 font-medium">提交成功！</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="feedback-email" className="block text-sm font-medium mb-2">
                    邮箱（可选，方便我们联系你）
                  </label>
                  <Input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="feedback-content" className="block text-sm font-medium mb-2">
                    反馈内容 *
                  </label>
                  <Textarea
                    id="feedback-content"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="遇到的问题、建议、想要的功能..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                    disabled={loading}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? '提交中...' : '提交'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
