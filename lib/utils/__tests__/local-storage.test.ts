import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGoal,
  getGoal,
  saveCheckin,
  getCheckins,
  getCheckinForWeek,
  type GoalData,
  type CheckinData,
} from '../local-storage';

describe('localStorage utils', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Goal management', () => {
    it('应该保存和获取目标数据', () => {
      const goalData: GoalData = {
        goalId: 'test-goal-1',
        trackId: 'tech-self-taught',
        answers: { target_role: '前端工程师' },
        createdAt: Date.now(),
      };

      saveGoal(goalData);
      const retrieved = getGoal();

      expect(retrieved).toEqual(goalData);
    });

    it('当无数据时应该返回 null', () => {
      expect(getGoal()).toBeNull();
    });
  });

  describe('Checkin management', () => {
    it('应该保存和获取打卡记录', () => {
      const checkin: CheckinData = {
        weekIndex: 0,
        summary: '完成了第一周学习',
        link: 'https://github.com/test',
        hoursSpent: 10,
        timestamp: Date.now(),
      };

      saveCheckin(checkin);
      const checkins = getCheckins();

      expect(checkins).toHaveLength(1);
      expect(checkins[0]).toEqual(checkin);
    });

    it('应该支持多条打卡记录', () => {
      const checkin1: CheckinData = {
        weekIndex: 0,
        summary: 'Week 1',
        link: '',
        hoursSpent: 10,
        timestamp: Date.now(),
      };
      const checkin2: CheckinData = {
        weekIndex: 1,
        summary: 'Week 2',
        link: '',
        hoursSpent: 12,
        timestamp: Date.now(),
      };

      saveCheckin(checkin1);
      saveCheckin(checkin2);

      expect(getCheckins()).toHaveLength(2);
    });

    it('应该根据周数查找打卡记录', () => {
      const checkin: CheckinData = {
        weekIndex: 5,
        summary: 'Week 5 done',
        link: '',
        hoursSpent: 15,
        timestamp: Date.now(),
      };

      saveCheckin(checkin);
      const found = getCheckinForWeek(5);

      expect(found).toEqual(checkin);
      expect(getCheckinForWeek(3)).toBeUndefined();
    });
  });
});
