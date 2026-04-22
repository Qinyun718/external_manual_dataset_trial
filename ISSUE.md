# Recharts 需要支持 WaterfallChart / WaterfallBar

## 1. 模拟的用户真实请求
> **[用户]**
> 我想在 Recharts 里直接画瀑布图，不想再用 `Bar` 加自定义 `shape` 去硬拼。现在这种绕法有几个问题：
> 1. tooltip 的颜色对不上柱子的正负类型；
> 2. Y 轴不会按累计过程自动扩 domain；
> 3. 合计柱（`total: true`）应该从 0 画到当前累计值，但现在很难稳定实现；
> 4. 我希望最后能直接从 `import { WaterfallChart, WaterfallBar } from 'recharts'` 使用。
>
> 还需要支持：
> - `WaterfallBar` 上的 `positiveFill`、`negativeFill`、`totalFill`
> - 默认颜色分别是 `#4caf50`、`#f44336`、`#2196f3`
> - `initialValue`
> - 自定义 `shape`

## 2. 详细问题描述
- 影响文件：`src/index.ts`，`src/state/selectors/axisSelectors.ts`，`src/state/selectors/combiners/combineTooltipPayload.ts`
- 现象一：base commit 中没有 `WaterfallChart` / `WaterfallBar` 的公开导出，也没有对应实现文件，用户无法以 Recharts 原生组件方式声明瀑布图。
- 现象二：tooltip 组合逻辑只在数组 payload 分支透传条目级 `color` / `fill`，单条 payload 场景下会退回系列级颜色，导致不同柱型悬浮时颜色不准确。
- 现象三：数值轴 domain 只看普通数据值，不看 waterfall 的累计过程；当正负累计跨零或插入合计柱时，图形范围会不正确。
- 对用户的实际影响：用户无法以稳定、可复用、可导出的方式实现瀑布图，现有 workaround 也无法保证 tooltip 颜色和累计值域正确。

## 3. 根本原因分析
- `src/index.ts`（final 约第 96-137 行新增导出）在 init 中没有 `WaterfallBar` / `WaterfallChart` 公开 API。
- `src/state/selectors/axisSelectors.ts`（final 约第 868-873 行新增分支）在 init 中没有针对 waterfall 累计值的 domain 计算逻辑。
- `src/state/selectors/combiners/combineTooltipPayload.ts`（final 约第 174-182 行）需要在单条 payload 分支也保留 item-level `color` / `fill`，否则 tooltip 会退回系列颜色。
- init 快照缺少 `src/cartesian/WaterfallBar.tsx`、`src/chart/WaterfallChart.tsx`、`src/state/selectors/waterfallSelectors.ts`、`src/state/types/WaterfallSettings.ts`，因此无法原生渲染 waterfall 图。

## 4. 期望结果

### 关键里程碑
| 验收编号 | 辅助 verifier | 评测动作（运行什么） | 检查位置（检查哪里） | 通过标准（应得到什么） | 常见失败表现 |
|----------|----------------|----------------------|----------------------|------------------------|--------------|
| A0 | - | 在 `$ISSUE_ROOT/` 运行 `bash reproduce.sh` | `$ISSUE_ROOT/workspace/` 与终端输出 | `workspace/` 成功由 `init/` 重建，并且 `npm ci --ignore-scripts` 完成依赖安装 | `workspace/` 未生成，或安装依赖时直接报错退出 |

### 自动化验证
| 验收编号 | 辅助 verifier | 评测动作（运行什么） | 检查位置（检查哪里） | 通过标准（应得到什么） | 常见失败表现 |
|----------|----------------|----------------------|----------------------|------------------------|--------------|
| A1 | `P1` | 在 `$ISSUE_ROOT/workspace/` 中检查 `src/index.ts`，并确认 `src/chart/WaterfallChart.tsx`、`src/cartesian/WaterfallBar.tsx`、`src/state/selectors/waterfallSelectors.ts`、`src/state/types/WaterfallSettings.ts` 不存在 | `workspace/src/index.ts` 与上述路径 | init 快照中没有 `WaterfallChart` / `WaterfallBar` 的公开导出，相关实现文件也不存在 | init 已经带有导出或实现文件，说明题目的 base 状态被污染 |
| A2 | `F1`、`F2` | 删除旧 `workspace/` 后，用 `final/` 重建 `workspace/`，在 `workspace/` 运行 `./node_modules/.bin/vitest run test/cartesian/WaterfallBar.spec.tsx test/chart/WaterfallChart.spec.tsx --project unit:lib` | 终端输出 | 两个新增测试文件全部通过，说明 public export、累计矩形计算、tooltip 颜色和核心交互行为都已满足 | 测试文件未通过，或 `WaterfallChart` / `WaterfallBar` 无法正常导入、渲染或计算 |
| A3 | `G1` | 在 final `workspace/` 运行 `./node_modules/.bin/tsc --noEmit` | 终端输出 | TypeScript 无报错退出，说明新图表接入后没有破坏库的类型检查 | 出现类型错误，说明实现虽然能跑部分测试，但整体快照不健康 |

### 人工操作验证
- 无。这个题目是库功能补充，主验收路径以现有单元测试和类型检查为主。

补充说明：如需一次性执行辅助 verifier，可在 `$ISSUE_ROOT/` 运行 `bash run-tests.sh`。该脚本会自动检查 `changes.diff` 能否从 `init/` 还原出 `final/`，再执行 `P1/F1/F2/G1`。

## 5. 改动方案
- 新增 `src/chart/WaterfallChart.tsx` 和 `src/cartesian/WaterfallBar.tsx`，提供可公开导出的瀑布图组件与柱型组件。
- 新增 `src/state/selectors/waterfallSelectors.ts` 与 `src/state/types/WaterfallSettings.ts`，把 waterfall 的累计矩形计算和配置接入现有状态层。
- 修改 `src/state/selectors/axisSelectors.ts`，让数值轴 domain 能按 waterfall 的累计过程计算。
- 修改 `src/state/selectors/combiners/combineTooltipPayload.ts`，在单条 payload 分支也保留 item-level 颜色，保证 tooltip 颜色跟柱子类型一致。
- 更新 `src/index.ts`、`src/state/graphicalItemsSlice.ts`、`src/zIndex/DefaultZIndexes.tsx` 以及对应 story / unit tests，把新图表接入公共 API 和现有测试体系。

## 6. 复现步骤

### 第一步：安装初始环境
```bash
ISSUE_ROOT="${ISSUE_ROOT:-./case_collection_issue_output}"
bash "$ISSUE_ROOT/reproduce.sh"
```

### 第二步：验证 init 状态下功能缺失
```bash
cd "$ISSUE_ROOT/workspace"
grep -n "WaterfallChart\|WaterfallBar" src/index.ts || true
test ! -f src/chart/WaterfallChart.tsx
test ! -f src/cartesian/WaterfallBar.tsx
test ! -f src/state/selectors/waterfallSelectors.ts
test ! -f src/state/types/WaterfallSettings.ts
```

对应验收项：`A1`

### 第三步：切换到 final 快照
```bash
rm -rf "$ISSUE_ROOT/workspace"
cp -r "$ISSUE_ROOT/final" "$ISSUE_ROOT/workspace"
cd "$ISSUE_ROOT/workspace"
npm ci --ignore-scripts
```

### 第四步：验证改动后效果
```bash
./node_modules/.bin/vitest run test/cartesian/WaterfallBar.spec.tsx test/chart/WaterfallChart.spec.tsx --project unit:lib
./node_modules/.bin/tsc --noEmit
```

对应验收项：`A2`、`A3`

辅助入口：
```bash
cd "$ISSUE_ROOT"
bash run-tests.sh
```

## 7. 元信息
- 仓库：`https://github.com/recharts/recharts.git`
- Base commit：`c619621191d0d828b023913f820620001ee0dd46`（2026-04-10 22:50:46 +0900）
- 题型：新功能实现
- 难度：高

## 8. 文件清单
| 文件/目录 | 用途说明 |
|-----------|----------|
| `ISSUE.md` | 题目描述、复现步骤、验证方法 |
| `reproduce.sh` | 创建 conda 环境并从 `init/` 重建 `workspace/` |
| `environment.yml` | 运行题包所需的 Python / Node.js / git 环境 |
| `run-tests.sh` | 统一执行辅助 verifier |
| `tests/test_outputs.py` | 自动化 verifier，负责 diff 完整性和 P/F/G 检查 |
| `changes.diff` | 从 `init/` 到 `final/` 的源码 diff |
| `init/` | base commit 快照 |
| `final/` | 参考实现快照 |
| `workspace/` | 由 `reproduce.sh` 生成，用于实际复现 |
