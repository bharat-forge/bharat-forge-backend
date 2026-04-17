CREATE TYPE "public"."contact_status" AS ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"company" varchar(255),
	"inquiry_type" varchar(100) NOT NULL,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
