import { test, expect } from '@playwright/test';
import { completeOnboarding, waitForPlanDone } from './helpers';

async function planUrlWithScenario(page: import('@playwright/test').Page, scenario: string) {
  await completeOnboarding(page);
  const url = new URL(page.url());
  url.searchParams.set('mock', scenario);
  await page.evaluate(() => localStorage.removeItem('learnflow_plan'));
  await page.goto(url.pathname + url.search);
}

test.describe('异常场景处理', () => {
  for (const [scenario, kind, title] of [
    ['not_found', 'not_found', '计划服务暂不可用'],
    ['rate_limited', 'rate_limited', '请求太频繁了'],
    ['offline', 'offline', '网络已断开'],
  ] as const) {
    test(`${scenario}：有明确状态、loading 结束、模板周补齐`, async ({ page }) => {
      await planUrlWithScenario(page, scenario);
      const alert = page.getByTestId(`plan-issue-${kind}`);
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toContainText(title);
      await expect(alert).toContainText('先用模板计划开始');
      await waitForPlanDone(page);
      await expect(page.getByTestId('week-card')).toHaveCount(12);
      await expect(page.getByRole('button', { name: '重试' })).toBeVisible();
    });
  }

  test('浏览器断网：不白屏，显示断网状态并用模板补齐', async ({ page, context }) => {
    await completeOnboarding(page);
    await waitForPlanDone(page);
    await page.evaluate(() => localStorage.removeItem('learnflow_plan'));
    await context.setOffline(true);
    await page.getByRole('button', { name: '重新生成模板周' }).click();
    await expect(page.getByTestId('plan-issue-offline')).toBeVisible();
    await expect(page.getByTestId('week-card')).toHaveCount(12);
    await context.setOffline(false);
  });

  test('流断处理：前端用模板补齐剩余周', async ({ page }) => {
    await planUrlWithScenario(page, 'truncate');
    await waitForPlanDone(page);
    const cards = page.getByTestId('week-card');
    await expect(cards).toHaveCount(12);
    await expect(cards.nth(3)).toContainText('模板计划');
    await expect(cards.nth(0)).not.toContainText('模板计划');
  });

  test('旧版/损坏的本地计划：提示「计划格式已更新，请重新生成」', async ({ page }) => {
    await completeOnboarding(page);
    await waitForPlanDone(page);
    const goalId = new URL(page.url()).searchParams.get('goalId');
    await page.evaluate((id) => {
      localStorage.setItem(
        'learnflow_plan',
        JSON.stringify({ goalId: id, weeks: [{ title: '旧计划', milestone: 'v1', topics: ['x'], practiceHours: 5 }] })
      );
    }, goalId);
    await page.reload();
    await expect(page.getByText('计划格式已更新，请重新生成')).toBeVisible();
    await expect(page.getByTestId('week-card')).toHaveCount(0);
    await page.getByRole('button', { name: '重新生成' }).click();
    await waitForPlanDone(page);
    await expect(page.getByTestId('week-card')).toHaveCount(12);
  });

  test('没有 goalId：显示引导而不是无限加载', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByTestId('plan-issue-no_goal')).toBeVisible();
    await expect(page.getByText('AI 正在生成你的计划...')).toHaveCount(0);
  });
});
