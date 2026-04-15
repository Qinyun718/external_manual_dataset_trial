# AI Coding 体验评测 — 出题试标仓库

本仓库用于 AI Coding 体验评测的**试标阶段**。请在真实开源仓库上，使用 AI Coding 工具实现新功能，验收通过后打包提交。

**试标要求：每人提交 3 道题，至少覆盖 2 个不同仓库。**

## 快速开始

1. **Fork 本仓库**到你自己的 GitHub 账号/组织下
2. 阅读 [`外包出题指南_v1.md`](外包出题指南_v1.md) — 操作手册，包含流程、质量要求
3. 从 [`candidate_tasks_all.json`](candidate_tasks_all.json) 中挑选候选题，或在可选仓库中自己出题
4. 查 [`base_commits.csv`](base_commits.csv) 找到对应仓库的 base commit
5. 实现功能并验收通过后，把 [`ISSUE_PACKAGING_PROMPT_EXTERNAL.md`](ISSUE_PACKAGING_PROMPT_EXTERNAL.md) 丢给 AI 工具完成打包
6. 创建分支，推送到**你 fork 的仓库**

## 仓库结构

```
README.md                            ← 本文件
外包出题指南_v1.md                     ← 操作手册（流程、质量红线）
candidate_tasks_all.json             ← 候选题（含需求描述、验收步骤、难度分级）
base_commits.csv                     ← 开源仓库的锁定 base commit
ISSUE_PACKAGING_PROMPT_EXTERNAL.md   ← 打包 prompt（丢给 AI 工具自动生成打包产物）
候选题清单_待审核.md                   ← 候选题的可读版（含难度标注）
```

## 提交规范

- 先 **fork 本仓库**，所有题目提交到你自己的 fork，不要直接推到原仓库
- **一题一分支**，分支命名：`<名字拼音>/<task-slug>`，如 `zhangsan/add-stepper-nuxtui`
- 打包产物直接放在分支根目录下
- 打包标准严格按照 `ISSUE_PACKAGING_PROMPT_EXTERNAL.md` 执行

## 可选仓库

根据你的技术栈任选，不限数量：

| 仓库 | 语言 | Stars |
|------|------|-------|
| nuxt/ui | Vue / TS | 6.4k |
| magicuidesign/magicui | React / TS | 20.7k |
| recharts/recharts | React / TS | 27k |
| callstack/react-native-paper | React Native / TS | 14.3k |
| honojs/hono | TypeScript | 29.9k |
| drizzle-team/drizzle-orm | TypeScript | 33.8k |
| go-chi/chi | Go | 22k |
| amacneil/dbmate | Go | 6.8k |
| gofiber/fiber | Go | 39.6k |
| android/compose-samples | Kotlin | 23k |
| ktorio/ktor | Kotlin | 14.3k |
| google/gson | Java | 24.2k |

## 质量要求

- 题目难度必须足够：与 AI 工具交互 **8 轮以上** 才能完成的题目才有评测价值
- 1-3 轮就完成的题目必须弃掉
- 详细要求见 [`外包出题指南_v1.md`](外包出题指南_v1.md) 中的"质量红线"章节
