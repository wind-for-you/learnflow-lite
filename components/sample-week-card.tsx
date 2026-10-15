import { templateWeeks } from '@/lib/mock/plan-data';

/** 首页示例：真实的一周计划卡片（与生成结果同一数据结构）。 */
export function SampleWeekCard() {
  const week = templateWeeks[0];
  return (
    <article
      data-testid="sample-week-card"
      className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm sm:p-6"
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary-700">示例 · 第 1 周</p>
      <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{week.title}</h3>
      {week.firstStep && (
        <p className="mt-3 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800">
          <span className="font-semibold">🚀 第一步（{week.firstStep.minutes} 分钟）：</span>
          {week.firstStep.action}
        </p>
      )}
      <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">📦 本周产出：</span>
        {week.deliverable}
      </p>
      <div className="mt-3">
        <h4 className="mb-1 text-sm font-semibold text-gray-900">✅ 完成标准</h4>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
          {week.doneCriteria.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
        ⏱️ 预计投入：{week.estimateHours} 小时 · 完成后提交链接打卡
      </p>
    </article>
  );
}
