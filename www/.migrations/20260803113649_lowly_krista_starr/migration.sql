CREATE TABLE `cn-pages` (
	`id` text PRIMARY KEY,
	`title` text,
	`slug` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE TABLE `cn-topbar` (
	`data` text DEFAULT '{}' NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX `idx_pages_slug` ON `cn-pages` (`slug`);