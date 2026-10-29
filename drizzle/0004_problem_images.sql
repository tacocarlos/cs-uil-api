CREATE TABLE `problem_images` (
	`id` integer PRIMARY KEY NOT NULL,
	`problem` integer NOT NULL,
	`createdAt` integer,
	`placeholder` text(32) NOT NULL,
	`url` text(2083) NOT NULL,
	`storage_provider` text DEFAULT 'uploadthing' NOT NULL,
	`storage_key` text NOT NULL,
	`width` integer,
	`height` integer,
	FOREIGN KEY (`problem`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problem_images_problem_placeholder` ON `problem_images` (`problem`,`placeholder`);