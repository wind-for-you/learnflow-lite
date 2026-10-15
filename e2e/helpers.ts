import { expect, type Page } from '@playwright/test';

export type HoursLabel = '5 小时' | '10 小时' | '15 小时' | '20 小时以上';

/** 走完 onboarding 五道题并点击「生成计划」。 */
export async function completeOnboarding(page: Page, hours: HoursLabel = '10 小时', role = '前端工程师') {
  await page.goto('/onboarding');
  await page.getByRole('textbox').fill('零基础，学过一点 HTML');
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('combobox').selectOption(role);
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('radio', { name: hours }).click();
  await expect(page.getByRole('radio', { name: hours })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('textbox').fill('6 个月内找到工作');
  await page.getByRole('button', { name: '下一题' }).click();
  await page.getByRole('textbox').fill('不知道从哪开始');
  await page.getByRole('button', { name: '生成计划' }).click();
  await expect(page).toHaveURL(/\/plan\?goalId=goal_\d+/);
}

/** 等待计划流结束（spinner 消失）。 */
export async function waitForPlanDone(page: Page) {
  await expect(page.getByText('AI 正在生成你的计划...')).toBeHidden({ timeout: 30000 });
}

/** 返回页面中所有可点击元素里尺寸小于 44px 的描述。 */
export async function smallTapTargets(page: Page): Promise<string[]> {
  // 等入场动画（如 scale-in）结束再量尺寸
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"]'
    );
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.height < 44 || r.width < 44) {
        out.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return out;
  });
}
