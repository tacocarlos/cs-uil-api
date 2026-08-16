ALTER TABLE `problems` ADD `verification_status` text DEFAULT 'unverified';--> statement-breakpoint
ALTER TABLE `problems` ADD `verification_message` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `verified_at` integer;