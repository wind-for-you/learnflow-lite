import type { WeekData, PlanRequest, WaitlistRequest } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ANSWER_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_FEEDBACK_LENGTH = 5000;
const MAX_DEVICE_ID_LENGTH = 100;

export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validatePlanRequest(req: unknown): PlanRequest {
  if (!req || typeof req !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const reqObj = req as Record<string, unknown>;
  const { trackId, answers, deviceId, weeks, keptWeeks } = reqObj;

  if (!trackId || typeof trackId !== 'string') {
    throw new ValidationError('trackId is required and must be a string');
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new ValidationError('answers is required and must be an object');
  }

  // Validate answer lengths
  const answersObj = answers as Record<string, unknown>;
  for (const [key, value] of Object.entries(answersObj)) {
    if (typeof value !== 'string') {
      throw new ValidationError(`Answer for "${key}" must be a string`);
    }
    if (value.length > MAX_ANSWER_LENGTH) {
      throw new ValidationError(`Answer for "${key}" exceeds maximum length`);
    }
  }

  if (!deviceId || typeof deviceId !== 'string') {
    throw new ValidationError('deviceId is required and must be a string');
  }

  if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
    throw new ValidationError('deviceId exceeds maximum length');
  }

  // Validate optional weeks array
  if (weeks !== undefined) {
    if (!Array.isArray(weeks)) {
      throw new ValidationError('weeks must be an array');
    }
    if (!weeks.every(w => typeof w === 'number' && Number.isInteger(w) && w >= 0)) {
      throw new ValidationError('weeks must contain non-negative integers');
    }
  }

  // Validate optional keptWeeks
  if (keptWeeks !== undefined) {
    if (!Array.isArray(keptWeeks)) {
      throw new ValidationError('keptWeeks must be an array');
    }
    for (const week of keptWeeks) {
      if (
        !week || 
        typeof week !== 'object' || 
        !('index' in week) || 
        !('title' in week) ||
        typeof week.index !== 'number' || 
        typeof week.title !== 'string'
      ) {
        throw new ValidationError('keptWeeks items must have index (number) and title (string)');
      }
    }
  }

  return { 
    trackId: trackId as string, 
    answers: answersObj as Record<string, string>, 
    deviceId: deviceId as string, 
    weeks: weeks as number[] | undefined, 
    keptWeeks: keptWeeks as { index: number; title: string }[] | undefined 
  };
}

export function validateWaitlistRequest(req: unknown): WaitlistRequest {
  if (!req || typeof req !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const reqObj = req as Record<string, unknown>;
  const { email, feedback, deviceId, page } = reqObj;

  if (!email && !feedback) {
    throw new ValidationError('At least one of email or feedback is required');
  }

  if (email !== undefined) {
    if (typeof email !== 'string') {
      throw new ValidationError('email must be a string');
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email format');
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      throw new ValidationError('email exceeds maximum length');
    }
  }

  if (feedback !== undefined) {
    if (typeof feedback !== 'string') {
      throw new ValidationError('feedback must be a string');
    }
    if (feedback.length > MAX_FEEDBACK_LENGTH) {
      throw new ValidationError('feedback exceeds maximum length');
    }
  }

  if (!deviceId || typeof deviceId !== 'string') {
    throw new ValidationError('deviceId is required and must be a string');
  }

  if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
    throw new ValidationError('deviceId exceeds maximum length');
  }

  if (page !== undefined && typeof page !== 'string') {
    throw new ValidationError('page must be a string');
  }

  return { email, feedback, deviceId, page };
}

export function validateWeekData(data: unknown): WeekData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const dataObj = data as Record<string, unknown>;
  const { title, milestone, tasks, resources } = dataObj;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return null;
  }

  if (!milestone || typeof milestone !== 'string' || milestone.trim().length === 0) {
    return null;
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  // Validate at least one task has a concrete deliverable
  let hasConcreteDeliverable = false;
  for (const task of tasks) {
    if (!task || typeof task !== 'object') {
      return null;
    }
    
    const taskObj = task as Record<string, unknown>;
    const { title: taskTitle, description, deliverable, acceptanceCriteria } = taskObj;
    
    if (!taskTitle || typeof taskTitle !== 'string') {
      return null;
    }
    
    if (!description || typeof description !== 'string') {
      return null;
    }
    
    if (!deliverable || typeof deliverable !== 'string' || deliverable.trim().length === 0) {
      return null;
    }
    
    if (!Array.isArray(acceptanceCriteria) || acceptanceCriteria.length === 0) {
      return null;
    }
    
    if (!acceptanceCriteria.every(c => typeof c === 'string' && c.trim().length > 0)) {
      return null;
    }

    // Check if this task has a concrete deliverable (not vague learning)
    if (deliverable.length > 10 && !isVagueDeliverable(deliverable)) {
      hasConcreteDeliverable = true;
    }
  }

  if (!hasConcreteDeliverable) {
    return null;
  }

  // Validate optional resources
  if (resources !== undefined) {
    if (!Array.isArray(resources)) {
      return null;
    }
    for (const resource of resources) {
      if (!resource || typeof resource !== 'object') {
        return null;
      }
      const resourceObj = resource as Record<string, unknown>;
      if (!resourceObj.title || typeof resourceObj.title !== 'string') {
        return null;
      }
      if (!resourceObj.url || typeof resourceObj.url !== 'string') {
        return null;
      }
    }
  }

  return data as WeekData;
}

function isVagueDeliverable(deliverable: string): boolean {
  const vaguePhrases = [
    'learn',
    'study',
    'understand',
    'read about',
    'familiarize',
    'explore',
    'basics',
    'introduction',
    'overview'
  ];
  
  const lower = deliverable.toLowerCase();
  return vaguePhrases.some(phrase => lower.includes(phrase) && !lower.includes('build') && !lower.includes('deploy'));
}
