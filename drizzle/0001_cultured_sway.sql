CREATE TABLE `competitions` (
	`id` integer PRIMARY KEY NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`level` text,
	`year` integer NOT NULL,
	`student_packet_url` text(2083) NOT NULL,
	`data_zip_url` text(2083) NOT NULL,
	`enabled` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY NOT NULL,
	`competition` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`name` text(128) NOT NULL,
	`number` integer NOT NULL,
	`markdown` text NOT NULL,
	`pdf_url` text(2083) NOT NULL,
	`student_data` text NOT NULL,
	`student_output` text NOT NULL,
	`test_data` text NOT NULL,
	`test_output` text NOT NULL,
	`solution` text NOT NULL,
	`enabled` integer DEFAULT false,
	FOREIGN KEY (`competition`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE no action
);
