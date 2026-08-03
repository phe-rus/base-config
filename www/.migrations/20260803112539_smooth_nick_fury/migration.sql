CREATE TABLE `cn-keywords` (
	`data` text DEFAULT '{}' NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE TABLE `cn-posts` (
	`id` text PRIMARY KEY,
	`title` text,
	`slug` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`issuer` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `fk_account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`impersonatedBy` text,
	CONSTRAINT `fk_session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`banReason` text,
	`banExpires` integer
);

CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

CREATE UNIQUE INDEX `idx_posts_slug` ON `cn-posts` (`slug`);
CREATE UNIQUE INDEX `account_issuer_providerAccountId_uidx` ON `account` (`issuer`,`providerAccountId`);
CREATE INDEX `account_userId_idx` ON `account` (`userId`);
CREATE INDEX `session_userId_idx` ON `session` (`userId`);
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);