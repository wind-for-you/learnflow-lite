import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

test.describe('视觉与可访问性测试', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  const pages = [
    { url: '/', name: 'home' },
    { url: '/onboarding', name: 'onboarding' },
  ];

  for (const viewport of viewports) {
    for (const pageInfo of pages) {
      test(`截图: ${pageInfo.name} @ ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        
        const screenshotPath = `artifacts/screenshots/${pageInfo.name}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
        
        // 验证无横向溢出
        const horizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(horizontalScroll).toBe(false);
        
        console.log(`✅ 截图已保存: ${screenshotPath}`);
      });
    }
  }

  test('可访问性: axe-core 检查对比度 WCAG AA', async ({ page }) => {
    const pagesToTest = ['/', '/onboarding'];
    const results: any[] = [];
    
    for (const url of pagesToTest) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      
      // 检查对比度违规
      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );
      
      results.push({
        url,
        totalViolations: accessibilityScanResults.violations.length,
        contrastViolations: contrastViolations.length,
        violations: accessibilityScanResults.violations,
      });
      
      // 对比度必须为 0 违规
      expect(contrastViolations).toHaveLength(0);
      
      console.log(`${url}:`);
      console.log(`  总违规: ${accessibilityScanResults.violations.length}`);
      console.log(`  对比度违规: ${contrastViolations.length}`);
    }
    
    // 保存报告
    fs.writeFileSync(
      'artifacts/reports/axe-results.json',
      JSON.stringify(results, null, 2)
    );
  });

  test('可点击元素最小尺寸: ≥44px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const clickableSelectors = 'button, a[href], [role="button"], input[type="submit"]';
    const clickableElements = await page.locator(clickableSelectors).all();
    
    const violations: any[] = [];
    
    for (let i = 0; i < clickableElements.length; i++) {
      const element = clickableElements[i];
      const box = await element.boundingBox();
      
      if (box && (box.width < 44 || box.height < 44)) {
        const tagName = await element.evaluate(el => el.tagName);
        const text = await element.textContent();
        violations.push({
          index: i,
          tagName,
          text: text?.substring(0, 50),
          width: box.width,
          height: box.height,
        });
      }
    }
    
    if (violations.length > 0) {
      console.log('❌ 可点击元素尺寸不足 44px:');
      violations.forEach(v => {
        console.log(`  ${v.tagName}: "${v.text}" (${v.width}x${v.height}px)`);
      });
    }
    
    expect(violations).toHaveLength(0);
  });

  test('首屏请求域名: 只有本站', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', (request) => {
      try {
        const url = new URL(request.url());
        requests.push(url.hostname);
      } catch (e) {
        // 忽略
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const uniqueHosts = [...new Set(requests)];
    
    console.log('首屏请求域名:', uniqueHosts);
    
    // 排除本地域名
    const externalHosts = uniqueHosts.filter(host => 
      host !== 'localhost' && 
      host !== '127.0.0.1' &&
      !host.startsWith('192.168.') &&
      !host.startsWith('10.') &&
      !host.startsWith('172.')
    );
    
    // 保存报告
    fs.writeFileSync(
      'artifacts/reports/network-requests.json',
      JSON.stringify({
        allHosts: uniqueHosts,
        externalHosts,
        totalRequests: requests.length,
      }, null, 2)
    );
    
    expect(externalHosts).toHaveLength(0);
  });
});
