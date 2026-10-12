import { test, expect } from '@playwright/test';

test.describe('异常场景录屏', () => {
  test.use({ 
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    }
  });

  test('录屏: 断网场景', async ({ page, context }) => {
    await page.goto('/onboarding');
    
    // 填写表单
    await page.fill('textarea', '断网录屏测试');
    await page.click('button:has-text("下一题")');
    await page.selectOption('select', '前端工程师');
    await page.click('button:has-text("下一题")');
    await page.fill('input[type="number"]', '10');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("生成计划")');
    
    // 等待生成开始
    await page.waitForSelector('text=第 1 周', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // 模拟断网
    await context.setOffline(true);
    await page.waitForTimeout(3000);
    
    // 恢复网络
    await context.setOffline(false);
    await page.waitForTimeout(2000);
  });

  test('录屏: 模板周标注与重新生成', async ({ page }) => {
    await page.goto('/onboarding');
    
    await page.fill('textarea', '模板录屏测试');
    await page.click('button:has-text("下一题")');
    await page.selectOption('select', '数据分析师');
    await page.click('button:has-text("下一题")');
    await page.fill('input[type="number"]', '15');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("生成计划")');
    
    // 等待生成完成
    await page.waitForTimeout(15000);
    
    // 查找模板标注
    const templateLabel = page.locator('text=模板计划');
    if (await templateLabel.count() > 0) {
      await templateLabel.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
      
      // 查找重新生成按钮
      const regenerateButton = page.locator('button:has-text("重新生成")');
      if (await regenerateButton.count() > 0) {
        await regenerateButton.first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('录屏: 流式生成过程', async ({ page }) => {
    await page.goto('/onboarding');
    
    await page.fill('textarea', '流式生成录屏测试');
    await page.click('button:has-text("下一题")');
    await page.selectOption('select', '移动端开发');
    await page.click('button:has-text("下一题")');
    await page.fill('input[type="number"]', '12');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("下一题")');
    await page.fill('textarea', '测试');
    await page.click('button:has-text("生成计划")');
    
    // 录制整个生成过程
    await page.waitForTimeout(15000);
    
    // 滚动查看所有生成的周
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    await page.waitForTimeout(2000);
  });
});
