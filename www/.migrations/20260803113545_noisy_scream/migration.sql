ALTER TABLE `cn-posts` RENAME TO `cn-docs`;
DROP INDEX IF EXISTS `idx_posts_slug`;
CREATE UNIQUE INDEX `idx_docs_slug` ON `cn-docs` (`slug`);