CREATE TABLE `cn-products` (
	`id` text PRIMARY KEY,
	`title` text,
	`slug` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX `idx_products_slug` ON `cn-products` (`slug`);