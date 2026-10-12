'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { getTrackById } from '@/config/tracks/public';
import { saveGoal } from '@/lib/utils/local-storage';
import { trackEvent } from '@/lib/analytics/client';

const TRACK_ID = 'tech-self-taught';

export default function OnboardingPage() {
  const router = useRouter();
  const track = getTrackById(TRACK_ID);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('onboarding_start');
  }, []);

  if (!track) {
    return <div>Track not found</div>;
  }

  const question = track.onboardingQuestions[currentStep];
  const isLastStep = currentStep === track.onboardingQuestions.length - 1;

  const handleNext = () => {
    const value = answers[question.id] || '';
    
    if (question.validation?.required && !value.trim()) {
      setError('请填写此项');
      return;
    }

    if (question.type === 'number') {
      const num = parseInt(value);
      if (question.validation?.min && num < question.validation.min) {
        setError(`最小值为 ${question.validation.min}`);
        return;
      }
      if (question.validation?.max && num > question.validation.max) {
        setError(`最大值为 ${question.validation.max}`);
        return;
      }
    }

    setError('');

    if (isLastStep) {
      const goalId = `goal_${Date.now()}`;
      const goalData = {
        goalId,
        trackId: TRACK_ID,
        answers,
        createdAt: Date.now(),
      };
      saveGoal(goalData);
      
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
    const value = answers[question.id] || '';
    const onChange = (val: string) => {
      setAnswers({ ...answers, [question.id]: val });
      setError('');
    };

    switch (question.type) {
      case 'number':
        return (
          <Input
            type="number"
            placeholder={question.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        );
      
      case 'select':
        return (
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
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
            placeholder={question.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            autoFocus
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {track.onboardingQuestions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 mx-1 rounded transition-colors ${
                  idx <= currentStep ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">
            第 {currentStep + 1} / {track.onboardingQuestions.length} 题
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900">
            {question.question}
          </h2>

          <div className="space-y-2">
            {renderInput()}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                上一题
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {isLastStep ? '生成计划' : '下一题'}
            </Button>
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-500 text-center">
          所有数据存储在你的浏览器本地，换设备或清除缓存会丢失
        </p>
      </div>
    </div>
  );
}
