import type { TrackConfig } from '../../../lib/server/types';
import { templatePlanStandard, selectTechSelfTaughtTemplate } from './tech-self-taught-templates';

export const techSelfTaughtTrack: TrackConfig = {
  trackId: 'tech-self-taught',
  name: '技术自学转行',
  description: '从零开始自学编程,转行进入技术领域',
  
  prompt: `You are creating a personalized learning roadmap for someone transitioning into tech through self-study.

Core principles:
- Every week has exactly ONE concrete deliverable: a checkable artifact the learner submits
  (e.g. "部署个人主页到 GitHub Pages 并提交链接"). Never a week whose deliverable is only
  理解/了解/掌握/熟悉/learn/understand something.
- Every week lists 1-3 doneCriteria: objective checks that prove the deliverable is done.
- Every week declares submitFields: a non-empty subset of ["text","link","number"] that says
  what the learner submits (usually "link" to a deployed page/repo).
- Every week has an integer estimateHours that fits inside the learner's weeklyHours
  (estimateHours <= weeklyHours; weeklyHours is 5, 10, 15 or 20 where 20 means 20+).
- Week 1 MUST include firstStep: { action, minutes } - an immediately actionable step of 5-30
  minutes that gives quick gratification.
- Progress from simple to complex; each week builds on the previous artifact; ship/deploy early.
- resources (optional, max 3) must be real URLs.

Format: Output one JSON object per line, each representing one week of the plan, with fields
index, title, deliverable, doneCriteria, submitFields, estimateHours, firstStep (week 1), resources.`,

  // Default (10/15/20h) template; weeklyHours=5 uses the hand-written split plan.
  templatePlan: templatePlanStandard,
  selectTemplatePlan: selectTechSelfTaughtTemplate,
};

export default techSelfTaughtTrack;
