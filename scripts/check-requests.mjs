#!/usr/bin/env node

import { chromium } from 'playwright';

(async () => {
  console.log('=== 首屏请求域名检查 ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const requests = [];
  
  page.on('request', (request) => {
    try {
      const url = new URL(request.url());
      requests.push({
        hostname: url.hostname,
        url: request.url(),
      });
    } catch (e) {
      // 忽略无效 URL
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  const uniqueHosts = [...new Set(requests.map(r => r.hostname))];
  
  console.log('所有请求域名:');
  uniqueHosts.forEach(host => console.log(`  - ${host}`));
  console.log('');
  
  const externalHosts = uniqueHosts.filter(host => 
    host !== 'localhost' && 
    host !== '127.0.0.1' &&
    !host.startsWith('192.168.') &&
    !host.startsWith('10.')
  );
  
  if (externalHosts.length > 0) {
    console.log('❌ 发现境外域名请求:');
    externalHosts.forEach(host => console.log(`  - ${host}`));
    process.exit(1);
  } else {
    console.log('✅ 首屏无境外域名请求');
  }
  
  await browser.close();
})();
