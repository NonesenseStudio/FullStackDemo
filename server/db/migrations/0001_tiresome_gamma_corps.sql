CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"title" varchar(100) NOT NULL,
	"route_name" varchar(100) NOT NULL,
	"route_path" varchar(255) NOT NULL,
	"component" varchar(255) NOT NULL,
	"page_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"icon" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_route_name_unique" UNIQUE("route_name"),
	CONSTRAINT "menus_route_path_unique" UNIQUE("route_path")
);
--> statement-breakpoint
CREATE TABLE "user_menus" (
	"user_id" integer NOT NULL,
	"menu_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_menus_user_id_menu_id_pk" PRIMARY KEY("user_id","menu_id")
);
--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_id_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_menus" ADD CONSTRAINT "user_menus_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_menus" ADD CONSTRAINT "user_menus_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;