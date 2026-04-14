DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
ALTER TABLE `problems` ALTER COLUMN "problem_text_url" TO "problem_text_url" text;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
ALTER TABLE `problems` ALTER COLUMN "student_data_url" TO "student_data_url" text;--> statement-breakpoint
ALTER TABLE `problems` ALTER COLUMN "student_output_url" TO "student_output_url" text;--> statement-breakpoint
ALTER TABLE `problems` ALTER COLUMN "test_data_url" TO "test_data_url" text;--> statement-breakpoint
ALTER TABLE `problems` ALTER COLUMN "test_output_url" TO "test_output_url" text;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `markdown`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `student_data`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `student_output`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `test_data`;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `test_output`;