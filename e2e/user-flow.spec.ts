import { test, expect } from '@playwright/test';
import { completeOnboarding, waitForPlanDone } from './helpers';

test.describe('完整用户流程', () => {
  test('首启→流式生成→模板周→重新生成→打卡→带 goalId 回到计划→刷新仍在', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI 学习规划助手');
    await page.getByRole('link', { name: '开始规划' }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    // onboarding 发送的 weeklyHours 为数字
    await completeOnboarding(page, '10 小时');
    const goal = await page.evaluate(() => JSON.parse(localStorage.getItem('learnflow_goal') ?? '{}'));
    expect(goal.answers.weeklyHours).toBe(10);

    // 流式：第 1 周先出现，此时仍在加载
    await expect(page.getByText(/^第 1 周：/)).toBeVisible({ timeout: 15000 });
    await waitForPlanDone(page);

    const cards = page.getByTestId('week-card');
    await expect(cards).toHaveCount(12);
    // 第 1 周顶部显示 firstStep，周卡片显示产出/完成标准/预计投入
    await expect(cards.first()).toContainText('第一步');
    await expect(cards.first()).toContainText('本周产出');
    await expect(cards.first()).toContainText('完成标准');
    await expect(cards.first()).toContainText('预计投入');
    // 超过 4 周：第 5 周起默认折叠
    await expect(cards.nth(3)).toContainText('完成标准');
    await expect(cards.nth(4)).not.toContainText('完成标准');
    await cards.nth(4).getByRole('button', { name: '展开' }).click();
    await expect(cards.nth(4)).toContainText('完成标准');

    // 模板周标注与重新生成
    await expect(page.getByText('模板计划').first()).toBeVisible();
    await page.getByRole('button', { name: '重新生成模板周' }).click();
    await waitForPlanDone(page);
    await expect(page.getByText('模板计划')).toHaveCount(0);

    // 打卡：单一 <a> 元素，链接携带 goalId
    const checkin = cards.first().getByRole('link', { name: '打卡' });
    await expect(checkin.locator('button')).toHaveCount(0);
    await expect(checkin).toHaveAttribute('href', /goalId=goal_\d+&week=0/);
    await checkin.click();
    await expect(page).toHaveURL(/\/checkin\?goalId=goal_\d+&week=0/);

    // submitFields 渲染为必填输入；未填完前提交按钮禁用
    const submit = page.getByRole('button', { name: '提交打卡' });
    const link = page.getByLabel('成果链接 *');
    await expect(link).toHaveAttribute('required', '');
    await expect(submit).toBeDisabled();
    await link.fill('not-a-url');
    await expect(submit).toBeDisabled();
    await link.fill('https://github.com/test');
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText('打卡成功')).toBeVisible({ timeout: 5000 });

    // 成功页展示下周产出与预计投入，并可带 goalId 返回计划
    const next = page.getByTestId('next-week');
    await expect(next).toContainText('第 2 周');
    await expect(next).toContainText('完成 20 道 JavaScript 基础练习题');
    await expect(next).toContainText('预计投入：8 小时');
    const back = page.getByRole('link', { name: '返回学习计划' });
    await expect(back).toHaveAttribute('href', /\/plan\?goalId=goal_\d+/);
    await back.click();
    await expect(page).toHaveURL(/\/plan\?goalId=goal_\d+/);
    await expect(page.getByText(/^第 1 周：/)).toBeVisible();
    await expect(page.getByTestId('plan-issue-no_goal')).toHaveCount(0);

    // 刷新后从 localStorage（schemaVersion 2）恢复
    await page.reload();
    await expect(page.getByTestId('week-card')).toHaveCount(12);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('learnflow_plan') ?? '{}'));
    expect(stored.schemaVersion).toBe(2);
  });

  test('首页：示例周卡片含产出与完成标准，「查看演示」可跳转', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('告别迷茫')).toHaveCount(0);
    await expect(page.getByText('先看一周计划长什么样')).toBeVisible();
    const card = page.getByTestId('sample-week-card');
    await expect(card).toContainText('本周产出');
    await expect(card).toContainText('完成标准');
    await page.getByRole('link', { name: '查看演示' }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(card).toBeInViewport();
  });

  test('prefers-reduced-motion 下动画被禁用', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const maxDuration = await page.evaluate(() => {
      let max = 0;
      document.querySelectorAll('*').forEach((el) => {
        const s = window.getComputedStyle(el);
        max = Math.max(max, parseFloat(s.animationDuration) || 0, parseFloat(s.transitionDuration) || 0);
      });
      return max;
    });
    expect(maxDuration).toBeLessThan(0.1);
    await context.close();
  });
});
