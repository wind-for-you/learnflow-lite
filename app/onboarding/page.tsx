'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { getTrackById } from '@/config/tracks/public';
import { saveGoal, clearPlan, type AnswerValue } from '@/lib/utils/local-storage';
import { trackEvent } from '@/lib/analytics/client';
import { cn } from '@/lib/utils/cn';

const TRACK_ID = 'tech-self-taught';

export default function OnboardingPage() {
  const router = useRouter();
  const track = getTrackById(TRACK_ID);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('onboarding_start');
  }, []);

  if (!track) {
    return <div>Track not found</div>;
  }

  const question = track.onboardingQuestions[currentStep];
  const isLastStep = currentStep === track.onboardingQuestions.length - 1;
  const value = answers[question.id];

  const setValue = (val: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [question.id]: val }));
    setError('');
  };

  const handleNext = () => {
    const isEmpty = value === undefined || (typeof value === 'string' && !value.trim());
    if (question.validation?.required && isEmpty) {
      setError(question.type === 'text' ? '请填写此项' : '请选择一项');
      return;
    }

    setError('');

    if (isLastStep) {
      const goalId = `goal_${Date.now()}`;
      saveGoal({ goalId, trackId: TRACK_ID, answers, createdAt: Date.now() });
      clearPlan();
      trackEvent('goal_created', { goalId, trackId: TRACK_ID });
      router.push(`/plan?goalId=${goalId}`);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case 'choice':
        return (
          <div role="radiogroup" aria-label={question.question} className="grid grid-cols-2 gap-3">
            {question.choices?.map((choice) => {
              const selected = value === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setValue(choice.value)}
                  className={cn(
                    'min-h-12 rounded-lg border px-4 text-base font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    selected
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        );

      case 'select':
        return (
          <Select
            aria-label={question.question}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">请选择...</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        );

      default:
        return (
          <Textarea
            aria-label={question.question}
            placeholder={question.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white px-4 pb-8 pt-6 sm:pt-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4">
          <div className="mb-2 flex justify-between">
            {track.onboardingQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`mx-1 h-1 flex-1 rounded transition-colors ${
                  idx <= currentStep ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            第 {currentStep + 1} / {track.onboardingQuestions.length} 题
          </p>
        </div>

        <div className="animate-fade-in space-y-6 rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">{question.question}</h2>

          <div className="space-y-2">
            {renderInput()}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                上一题
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {isLastStep ? '生成计划' : '下一题'}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          所有数据存储在你的浏览器本地，换设备或清除缓存会丢失
        </p>
      </div>
    </div>
  );
}
