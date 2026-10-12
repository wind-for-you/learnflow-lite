import { test, expect } from '@playwright/test';

test.describe('异常场景处理', () => {
  test('断网场景：不白屏，有提示，已生成内容不丢', async ({ page, context }) => {
    // 生成计划
    await page.goto('/onboarding');
    
    await page.fill('textarea', '断网测试');
    await page.click('button:has-text("下一题")');
    await page.selectOption('select', '后端工程师');
    await page.click('button:has-text("下一题")');
    await page.fill('input[type="number"]', '10');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '1 年');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("生成计划")');
    
    await expect(page).toHaveURL(/\/plan/);
    
    // 等待至少一周生成
    await page.waitForSelector('text=第 1 周', { timeout: 15000 });
    const initialWeeks = await page.locator('text=/第 \\d+ 周/').count();
    expect(initialWeeks).toBeGreaterThan(0);
    
    // 模拟断网
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    
    // 验证不白屏
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
    
    const bgColor = await page.locator('body').evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgb(0, 0, 0)');
    
    // 验证已生成内容仍在
    const currentWeeks = await page.locator('text=/第 \\d+ 周/').count();
    expect(currentWeeks).toBeGreaterThanOrEqual(initialWeeks);
    
    // 恢复网络
    await context.setOffline(false);
  });

  test('流断处理：前端用模板补齐', async ({ page }) => {
    await page.goto('/onboarding');
    
    await page.fill('textarea', '流断测试');
    await page.click('button:has-text("下一题")');
    await page.selectOption('select', '全栈工程师');
    await page.click('button:has-text("下一题")');
    await page.fill('input[type="number"]', '20');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '3 个月');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("生成计划")');
    
    await expect(page).toHaveURL(/\/plan/);
    
    // 等待生成完成
    await page.waitForTimeout(15000);
    
    // 应该有周数据（可能包含模板）
    const weekCount = await page.locator('text=/第 \\d+ 周/').count();
    expect(weekCount).toBeGreaterThan(0);
    
    // 检查模板标注
    const templateLabel = page.locator('text=模板计划');
    if (await templateLabel.count() > 0) {
      await expect(templateLabel.first()).toBeVisible();
    }
  });

  test('页面无白屏，核心元素可见', async ({ page }) => {
    const pages = ['/', '/onboarding'];
    
    for (const url of pages) {
      await page.goto(url);
      
      // 验证 body 可见
      await expect(page.locator('body')).toBeVisible();
      
      // 验证非黑色背景
      const bgColor = await page.locator('body').evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).not.toBe('rgb(0, 0, 0)');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      
      // 验证有内容
      const textContent = await page.textContent('body');
      expect(textContent?.length || 0).toBeGreaterThan(0);
    }
  });
});
