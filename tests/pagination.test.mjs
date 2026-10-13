import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/pg-proxy";

const nuxtRequire = createRequire(import.meta.resolve("nuxt"));
const h3Url = pathToFileURL(nuxtRequire.resolve("h3")).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "h3") {
      return nextResolve(h3Url, context);
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

let queries = [];
let rows = [];
let total = 0;
const db = drizzle(async (query, params) => {
  queries.push({ query, params });
  return { rows: query.includes("count(*)") ? [[String(total)]] : rows };
});
mock.module(new URL("../server/utils/db.ts", import.meta.url).href, {
  namedExports: { getDb: () => db },
});

const menuPage = (await import("../server/api/menu/page.post.ts")).default;
const userPage = (await import("../server/api/user/page.post.ts")).default;
const menuList = (await import("../server/api/menu/index.get.ts")).default;
const userList = (await import("../server/api/user/index.get.ts")).default;
const date = "2026-10-13T00:00:00.000Z";

function fixture(nextRows = [], nextTotal = 0) {
  queries = [];
  rows = nextRows;
  total = nextTotal;
}

function request(body = {}) {
  return {
    method: "POST",
    _requestBody: JSON.stringify(body),
    node: { req: { headers: { "content-type": "application/json" } } },
  };
}

describe("分页接口", () => {
  test("用户列表默认返回第一页、总数和公开字段", async () => {
    fixture([[1, "alice", date]], 21);
    const result = await userPage(request());
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 10);
    assert.equal(result.total, 21);
    assert.equal(result.list[0].username, "alice");
    assert.deepEqual(Object.keys(result.list[0]), ["id", "username", "createdAt"]);
    assert.equal(queries.length, 2);
    assert.match(queries[0].query, /order by "users"\."created_at" desc, "users"\."id" desc limit/);
    assert.doesNotMatch(queries[0].query, /password_hash/);
    assert.deepEqual(queries[0].params, [10]);
  });

  test("菜单分页保留排序并返回当前页之外的上级菜单名称", async () => {
    fixture([[11, 1, "子菜单", "child", "/child", "child.vue", {}, null, 0, false, date, date, "上级菜单"]], 30);
    const result = await menuPage(request({ page: 2, pageSize: 10 }));
    assert.equal(result.page, 2);
    assert.equal(result.total, 30);
    assert.equal(result.list[0].parentTitle, "上级菜单");
    assert.match(queries[0].query, /left join "menus" "parent"/);
    assert.match(queries[0].query, /order by "menus"\."created_at" desc, "menus"\."id" desc/);
    assert.deepEqual(queries[0].params, [10, 10]);
  });

  test("菜单筛选作用于列表和总数，按字面值匹配通配符", async () => {
    fixture([], 4);
    const result = await menuPage(request({ page: 3, pageSize: 20, title: " 菜单_%\\ ", routePath: "/Admin", hidden: "true" }));
    assert.equal(result.total, 4);
    assert.deepEqual(queries[0].params, ["%菜单\\_\\%\\\\%", "%/Admin%", true, 20, 40]);
    assert.deepEqual(queries[1].params, queries[0].params.slice(0, 3));
    assert.match(queries[0].query, /"menus"\."title" ilike/);
    assert.match(queries[1].query, /"menus"\."hidden" =/);
  });

  test("用户账号和编号保留包含匹配，列表与总数使用相同筛选", async () => {
    fixture([], 3);
    const result = await userPage(request({ username: "Alice_", id: "12", page: 2, pageSize: 20 }));
    assert.equal(result.total, 3);
    assert.deepEqual(queries[0].params, ["%Alice\\_%", "%12%", 20, 20]);
    assert.deepEqual(queries[1].params, ["%Alice\\_%", "%12%"]);
    assert.match(queries[0].query, /"users"\."id"::text ilike/);
  });

  test("显示状态 false 正确参与筛选", async () => {
    fixture();
    await menuPage(request({ hidden: "false" }));
    assert.deepEqual(queries[0].params, [false, 10]);
    assert.deepEqual(queries[1].params, [false]);
  });

  for (const [name, handler] of [["菜单", menuPage], ["用户", userPage]]) {
    test(`${name}空页返回空列表和实际总数`, async () => {
      fixture([], 21);
      assert.deepEqual(await handler(request({ page: 99, pageSize: 50 })), {
        list: [], total: 21, page: 99, pageSize: 50, sortBy: "createdAt", sortDirection: "desc",
      });
      fixture();
      assert.deepEqual(await handler(request()), {
        list: [], total: 0, page: 1, pageSize: 10, sortBy: "createdAt", sortDirection: "desc",
      });
    });

    test(`${name}拒绝非法、重复、过大的分页参数，且不访问数据库`, async () => {
      for (const body of [
        { page: 0 }, { page: -1 }, { page: 1.5 }, { page: "1" }, { pageSize: 0 },
        { pageSize: -1 }, { pageSize: 1.5 }, { pageSize: 101 },
        { page: Number.MAX_SAFE_INTEGER, pageSize: 100 }, { sortBy: "passwordHash" },
        { sortDirection: "sideways" }, [],
      ]) {
        fixture();
        await assert.rejects(handler(request(body)), { statusCode: 400 }, JSON.stringify(body));
        assert.equal(queries.length, 0);
      }
    });
  }

  test("拒绝不合法的筛选和排序参数", async () => {
    fixture();
    await assert.rejects(menuPage(request({ hidden: "invalid" })), { statusCode: 400 });
    await assert.rejects(menuPage(request({ title: "x".repeat(101) })), { statusCode: 400 });
    await assert.rejects(userPage(request({ username: "x".repeat(51) })), { statusCode: 400 });
    assert.equal(queries.length, 0);
  });

  test("用户和菜单按允许字段稳定排序，并支持升序", async () => {
    fixture();
    const userResult = await userPage(request({ sortBy: "username", sortDirection: "asc" }));
    assert.equal(userResult.sortBy, "username");
    assert.equal(userResult.sortDirection, "asc");
    assert.match(queries[0].query, /order by "users"\."username" asc, "users"\."id" asc/);
    fixture();
    await menuPage(request({ sortBy: "sortOrder", sortDirection: "asc" }));
    assert.match(queries[0].query, /order by "menus"\."sort_order" asc, "menus"\."id" asc/);
  });

  test("原有用户列表和详情接口仍返回原有结构", async () => {
    fixture([[1, "alice", date]]);
    assert.equal((await userList({ path: "/api/user" }))[0].username, "alice");
    assert.equal((await userList({ path: "/api/user?id=1" })).username, "alice");
    assert.doesNotMatch(queries[0].query, /limit|count\(\*\)|password_hash/);
  });

  test("原有菜单列表和详情接口仍返回原有结构", async () => {
    fixture([[1, null, "菜单", "menu", "/menu", "menu.vue", {}, null, 0, false, date, date]]);
    assert.equal((await menuList({ path: "/api/menu" }))[0].title, "菜单");
    assert.equal((await menuList({ path: "/api/menu?id=1" })).title, "菜单");
    assert.doesNotMatch(queries[0].query, /limit|count\(\*\)/);
  });
});
