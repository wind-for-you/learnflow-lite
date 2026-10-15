import { test, expect } from '@playwright/test';
import { completeOnboarding, smallTapTargets, waitForPlanDone } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

test('375px：所有可点击元素 ≥ 44px，模板标记不挤压标题', async ({ page }) => {
  await page.goto('/onboarding');
  expect(await smallTapTargets(page)).toEqual([]);

  await completeOnboarding(page);
  await waitForPlanDone(page);
  expect(await smallTapTargets(page)).toEqual([]);

  // 模板计划 badge 位于标题下方
  const card = page.getByTestId('week-card').filter({ hasText: '模板计划' }).first();
  const titleBox = await card.locator('h3').boundingBox();
  const badgeBox = await card.getByText('模板计划', { exact: true }).boundingBox();
  expect(titleBox && badgeBox && badgeBox.y >= titleBox.y + titleBox.height - 1).toBeTruthy();

  await page.getByRole('button', { name: '反馈' }).click();
  expect(await smallTapTargets(page)).toEqual([]);
  await page.getByRole('button', { name: '取消' }).click();

  await page.getByTestId('week-card').first().getByRole('link', { name: '打卡' }).click();
  await expect(page).toHaveURL(/\/checkin/);
  expect(await smallTapTargets(page)).toEqual([]);
});
