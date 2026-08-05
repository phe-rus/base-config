CREATE TABLE `cn-category` (
	`data` text DEFAULT '{}' NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
