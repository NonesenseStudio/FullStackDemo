# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## 菜单与用户分页接口

表格页默认通过以下接口读取列表，筛选和分页均在数据库中执行：

| 接口 | 筛选参数 |
| --- | --- |
| `POST /api/menu/page` | `title`（菜单名称）、`routePath`（路由路径）、`hidden`（`true` / `false`） |
| `POST /api/user/page` | `username`（账号）、`id`（用户编号） |

通用参数为 `page`（默认 1）和 `pageSize`（默认 10，最大 100），均须为正整数。
请求体使用 JSON。排序参数为 `sortBy` 和 `sortDirection`（`asc` / `desc`）；默认按 `createdAt` 倒序，最新记录优先；表格标题可切换排序方向。
文本筛选忽略大小写并按字面值包含匹配；用户编号也保留包含匹配。
返回结构为 `{ list, total, page, pageSize }`，其中 `total` 为符合筛选条件的总条数。
菜单列表额外返回 `parentTitle`，用于显示当前页之外的上级菜单名称；用户列表不包含密码字段。
非法参数返回 400；超出总页数时返回空列表和实际总条数，表格页会自动回到最后一页。

原有 `/api/menu`、`/api/user` 的全量列表和详情接口保留。
菜单表格仅在新增、编辑、删除弹窗打开前读取完整菜单层级，用于上级菜单选项和子菜单删除数量。

运行分页接口测试（Node.js 24）：

```bash
node --experimental-test-module-mocks --test tests/pagination.test.mjs
```
