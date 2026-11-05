CREATE TABLE `guides` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`client` text NOT NULL,
	`started_at` integer NOT NULL,
	`status` text NOT NULL,
	`guide_id` text
);
