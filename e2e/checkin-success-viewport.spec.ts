import { test, expect } from '@playwright/test';
import { completeOnboarding, waitForPlanDone } from './helpers';

for (const viewport of [
  { width: 375, height: 667 },
  { width: 1440, height: 900 },
]) {
  test(`打卡成功页首屏可见「返回学习计划」@ ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);
    await waitForPlanDone(page);
    await page.getByTestId('week-card').first().getByRole('link', { name: '打卡' }).click();
    await page.getByLabel('成果链接 *').fill('https://github.com/test');
    await page.getByRole('button', { name: '提交打卡' }).click();
    await expect(page.getByText('打卡成功')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole('link', { name: '返回学习计划' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('next-week')).toBeVisible();
  });
}
