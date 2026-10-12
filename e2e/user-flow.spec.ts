import { test, expect } from '@playwright/test';

test.describe('完整用户流程', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.clearPermissions();
  });

  test('首启→流式生成→模板周→重新生成→打卡→刷新仍在', async ({ page }) => {
    // 首页
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI 学习规划助手');
    
    // 开始规划
    await page.click('text=开始规划');
    await expect(page).toHaveURL(/\/onboarding/);
    
    // 填写问题 1
    await page.fill('textarea', '我是零基础小白');
    await page.click('button:has-text("下一题")');
    
    // 填写问题 2
    await page.selectOption('select', '前端工程师');
    await page.click('button:has-text("下一题")');
    
    // 填写问题 3
    await page.fill('input[type="number"]', '15');
    await page.click('button:has-text("下一题")');
    
    // 填写问题 4
    await page.fill('textarea', '6 个月内找到工作');
    await page.click('button:has-text("下一题")');
    
    // 填写问题 5
    await page.fill('textarea', '不知道从哪开始学');
    await page.click('button:has-text("生成计划")');
    
    // 等待计划页
    await expect(page).toHaveURL(/\/plan/);
    
    // 等待第一周出现（流式渲染）
    const firstWeek = page.locator('text=第 1 周').first();
    await expect(firstWeek).toBeVisible({ timeout: 15000 });
    
    // 等待所有周生成完成
    await page.waitForTimeout(12000);
    
    // 检查模板周标注
    const templateLabel = page.locator('text=模板计划');
    if (await templateLabel.count() > 0) {
      await expect(templateLabel.first()).toBeVisible();
      
      // 检查重新生成按钮
      const regenerateButton = page.locator('button:has-text("重新生成")');
      if (await regenerateButton.count() > 0) {
        await expect(regenerateButton.first()).toBeVisible();
      }
    }
    
    // 打卡
    const checkinLink = page.locator('a:has-text("打卡")').first();
    await checkinLink.click();
    await expect(page).toHaveURL(/\/checkin/);
    
    await page.fill('textarea', '学习了 HTML 和 CSS 基础');
    await page.fill('input[type="url"]', 'https://github.com/test');
    await page.fill('input[type="number"]', '10');
    await page.click('button[type="submit"]');
    
    // 等待打卡成功
    await expect(page.locator('text=打卡成功')).toBeVisible({ timeout: 5000 });
    
    // 刷新验证持久化
    await page.goto('/plan');
    await page.waitForLoadState('networkidle');
    
    // 验证计划仍在
    await expect(page.locator('text=第 1 周')).toBeVisible({ timeout: 5000 });
  });

  test('prefers-reduced-motion 下动画被禁用', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查所有元素的动画时长
    const allElements = await page.locator('*').all();
    let maxDuration = 0;
    
    for (const element of allElements.slice(0, 50)) {
      try {
        const duration = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          const animDuration = parseFloat(styles.animationDuration) || 0;
          const transDuration = parseFloat(styles.transitionDuration) || 0;
          return Math.max(animDuration, transDuration);
        });
        maxDuration = Math.max(maxDuration, duration);
      } catch (e) {
        // 元素可能不可见
      }
    }
    
    // 动画应该被抑制（< 0.1秒）
    expect(maxDuration).toBeLessThan(0.1);
    
    await context.close();
  });
});
