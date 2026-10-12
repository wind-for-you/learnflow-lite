export interface CheckinData {
  weekIndex: number;
  summary: string;
  link: string;
  hoursSpent: number;
  timestamp: number;
}

export interface GoalData {
  goalId: string;
  trackId: string;
  answers: Record<string, string>;
  createdAt: number;
}

const GOAL_KEY = 'learnflow_goal';
const CHECKINS_KEY = 'learnflow_checkins';

export function saveGoal(data: GoalData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, JSON.stringify(data));
}

export function getGoal(): GoalData | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(GOAL_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveCheckin(checkin: CheckinData): void {
  if (typeof window === 'undefined') return;
  const checkins = getCheckins();
  checkins.push(checkin);
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
}

export function getCheckins(): CheckinData[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(CHECKINS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getCheckinForWeek(weekIndex: number): CheckinData | undefined {
  return getCheckins().find((c) => c.weekIndex === weekIndex);
}
