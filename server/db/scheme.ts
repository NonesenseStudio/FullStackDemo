import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references((): AnyPgColumn => menus.id, {
    onDelete: "cascade",
  }),
  title: varchar("title", { length: 100 }).notNull(),
  routeName: varchar("route_name", { length: 100 }).notNull().unique(),
  routePath: varchar("route_path", { length: 255 }).notNull().unique(),
  component: varchar("component", { length: 255 }).notNull(),
  pageMeta: jsonb("page_meta")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  icon: varchar("icon", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userMenus = pgTable("user_menus", {
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  menuId: integer("menu_id")
    .notNull()
    .references(() => menus.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.menuId] })]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
