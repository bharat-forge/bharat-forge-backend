CREATE TABLE "dealer_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"last_restocked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dealer_manual_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_sold" integer NOT NULL,
	"sale_price" double precision NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"invoice_reference" text,
	"sale_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dealer_inventory" ADD CONSTRAINT "dealer_inventory_dealer_id_dealer_profiles_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_manual_sales" ADD CONSTRAINT "dealer_manual_sales_dealer_id_dealer_profiles_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealer_profiles"("id") ON DELETE no action ON UPDATE no action;