ALTER TABLE `problems` ADD `problem_text_url` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `student_data_url` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `student_output_url` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `test_data_url` text;--> statement-breakpoint
ALTER TABLE `problems` ADD `test_output_url` text;--> statement-breakpoint
ALTER TABLE `problems` DROP COLUMN `pdf_url`;
