import { test } from '@playwright/test';
import { completeOnboarding, waitForPlanDone } from './helpers';

test.use({ video: { mode: 'on', size: { width: 1280, height: 720 } } });

test.describe('异常场景录屏', () => {
  test('录屏: 断网场景', async ({ page }) => {
    await completeOnboarding(page);
    const url = new URL(page.url());
    url.searchParams.set('mock', 'offline');
    await page.evaluate(() => localStorage.removeItem('learnflow_plan'));
    await page.goto(url.pathname + url.search);
    await waitForPlanDone(page);
    await page.waitForTimeout(1000);
  });

  test('录屏: 流式生成、模板周标注与重新生成', async ({ page }) => {
    await completeOnboarding(page, '15 小时', '数据分析师');
    await waitForPlanDone(page);
    await page.getByRole('button', { name: '重新生成模板周' }).click();
    await waitForPlanDone(page);
    await page.waitForTimeout(1000);
  });
});
