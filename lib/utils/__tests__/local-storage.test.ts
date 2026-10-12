import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGoal,
  getGoal,
  saveCheckin,
  getCheckins,
  getCheckinForWeek,
  savePlan,
  loadPlan,
  type GoalData,
  type CheckinData,
  type StoredWeek,
} from '../local-storage';
import { getTemplateWeek } from '@/lib/mock/plan-data';

const week = (index: number): StoredWeek => ({ ...getTemplateWeek(index, 10), index, source: 'ai' });

describe('localStorage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Goal', () => {
    it('保存和读取目标，weeklyHours 为数字', () => {
      const goal: GoalData = {
        goalId: 'g1',
        trackId: 'tech-self-taught',
        answers: { targetRole: '前端工程师', weeklyHours: 10 },
        createdAt: 1,
      };
      saveGoal(goal);
      expect(getGoal()).toEqual(goal);
      expect(typeof getGoal()?.answers.weeklyHours).toBe('number');
    });

    it('无数据时返回 null', () => {
      expect(getGoal()).toBeNull();
    });
  });

  describe('Plan (schemaVersion 2)', () => {
    it('保存后可读取并通过校验', () => {
      savePlan('g1', [week(0), week(1)]);
      const result = loadPlan('g1');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.plan.schemaVersion).toBe(2);
        expect(result.plan.weeks).toHaveLength(2);
      }
    });

    it('旧版本（v1 字段）数据判定为 outdated', () => {
      localStorage.setItem(
        'learnflow_plan',
        JSON.stringify({ goalId: 'g1', weeks: [{ title: 'x', milestone: 'y', topics: [] }] })
      );
      expect(loadPlan('g1').status).toBe('outdated');
    });

    it('损坏 JSON 判定为 outdated', () => {
      localStorage.setItem('learnflow_plan', '{oops');
      expect(loadPlan('g1').status).toBe('outdated');
    });

    it('goalId 不匹配视为空', () => {
      savePlan('g1', [week(0)]);
      expect(loadPlan('g2').status).toBe('empty');
    });
  });

  describe('Checkin', () => {
    it('保存、覆盖同周、按周查找', () => {
      const c1: CheckinData = { weekIndex: 0, values: { link: 'https://a.dev' }, timestamp: 1 };
      const c2: CheckinData = { weekIndex: 0, values: { link: 'https://b.dev' }, timestamp: 2 };
      const c3: CheckinData = { weekIndex: 5, values: { number: '8' }, timestamp: 3 };
      saveCheckin(c1);
      saveCheckin(c2);
      saveCheckin(c3);
      expect(getCheckins()).toHaveLength(2);
      expect(getCheckinForWeek(0)).toEqual(c2);
      expect(getCheckinForWeek(3)).toBeUndefined();
    });
  });
});
