<a href="https://dub.co">
  <img alt="Dub 是现代化的开源链接归因平台，提供短链接、转化跟踪和联盟营销计划。" src="https://github.com/user-attachments/assets/42cf0705-f5a2-4200-bc4a-c5acf0ba9e15">
</a>

<h3 align="center">Dub</h3>

<p align="center">
    开源链接归因平台。
    <br />
    <a href="https://dub.co"><strong>了解更多 »</strong></a>
    <br />
    <br />
    <a href="#简介"><strong>简介</strong></a> ·
    <a href="#技术栈"><strong>技术栈</strong></a> ·
    <a href="#自托管"><strong>自托管</strong></a> ·
    <a href="#参与贡献"><strong>参与贡献</strong></a>
</p>

<p align="center">
  <a href="https://twitter.com/dubdotco">
    <img src="https://img.shields.io/twitter/follow/dubdotco?style=flat&label=%40dubdotco&logo=twitter&color=0bf&logoColor=fff" alt="Twitter" />
  </a>
  <a href="https://news.ycombinator.com/item?id=32939407"><img src="https://img.shields.io/badge/Hacker%20News-255-%23FF6600" alt="Hacker News"></a>
  <a href="https://github.com/dubinc/dub/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/dubinc/dub?label=license&logo=github&color=f80&logoColor=fff" alt="License" />
  </a>
</p>

<br/>

## 简介

Dub 是现代化的开源链接归因平台，提供[短链接](https://dub.co/home)、[转化跟踪](https://dub.co/analytics)和[联盟营销计划](https://dub.co/partners)功能。

我们的平台每月处理超过 1 亿次点击和 200 万条链接，被众多世界级营销团队使用，客户包括 Twilio、Buffer、Framer、Perplexity、Vercel、Laravel 等[知名企业](https://dub.co/customers)。

## 技术栈

- [Next.js](https://nextjs.org/) – 框架
- [TypeScript](https://www.typescriptlang.org/) – 编程语言
- [Tailwind](https://tailwindcss.com/) – CSS 框架
- [Prisma](https://www.prisma.io/) – ORM
- [Upstash](https://upstash.com/) – Redis
- [Tinybird](https://tinybird.com/) – 数据分析
- [PlanetScale](https://planetscale.com/) – 数据库
- [NextAuth.js](https://next-auth.js.org/) – 身份认证
- [BoxyHQ](https://boxyhq.com/enterprise-sso) – SSO/SAML
- [Turborepo](https://turbo.build/repo) – Monorepo 管理
- [Stripe](https://stripe.com/) – 支付
- [Resend](https://resend.com/) – 邮件
- [Vercel](https://vercel.com/) – 部署

## 自托管

您可以自托管 Dub，以便更好地掌控数据和界面设计。[阅读此指南](https://dub.co/docs/self-hosting/guide)了解更多信息。

## 参与贡献

我们欢迎所有贡献者！以下是参与贡献的方式：

- 如果您发现了 Bug，请[提交 Issue](https://github.com/dubinc/dub/issues)。
- 按照[本地开发指南](https://dub.co/docs/local-development)搭建本地开发环境。
- 提交 [Pull Request](https://github.com/dubinc/dub/pull) 来添加新功能、改善体验或修复 Bug。

### 推荐版本

| 依赖   | 版本     |
| ------ | -------- |
| node   | v23.11.0 |
| pnpm   | 9.15.9   |

### 常见本地开发问题

- `The table <table-name> does not exist in the current database.` — 运行 `pnpm prisma:push` 将 Prisma schema 文件的状态推送到数据库，无需使用迁移文件。
- 项目本地构建失败 — 请确认 `node` 和 `pnpm` 的版本与上述推荐版本一致。删除 `apps` 和 `packages` 目录下的所有 `node_modules`、`.next` 和 `.turbo` 目录，然后运行 `pnpm install` 重新安装依赖，并尝试使用 `pnpm build` 重新构建项目。

### 开发种子脚本

此脚本用于向数据库填充开发测试数据。

**基本填充（不删除现有数据）：**

```bash
cd apps/web
pnpm run script dev/seed
```

**清空数据库后填充（先删除所有现有数据）：**

```bash
cd apps/web
pnpm run script dev/seed --truncate
```

使用 `--truncate` 参数时，脚本会在删除数据前要求确认。

## 仓库动态

![Dub 仓库动态 – 由 Axiom 生成](https://repobeats.axiom.co/api/embed/6ac4c94a89ea20e2e10032b932a128b6d8442e66.svg "Repobeats 分析图")

## 许可证

Dub Technologies, Inc. 是一家商业化开源公司，这意味着本开源仓库中的部分内容需要商业许可。这一概念被称为"开放核心"（Open Core）——核心技术（99%）完全开源，基于 [AGPLv3](https://opensource.org/license/agpl-v3) 许可证发布；其余 1% 由商业许可证覆盖（["/ee" 企业版](<https://github.com/dubinc/dub/tree/ee/apps/web/app/(ee)>)），我们认为这些企业功能主要面向需要高级特性的大型组织。企业功能由 Dub Technologies, Inc. 的核心工程团队（全职员工）负责开发。
