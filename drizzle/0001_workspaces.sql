-- Workspace izolasyonu. Mevcut veri tek bir "artriyum" workspace'ine taşınır.
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `workspaces` (`id`, `name`, `created_at`)
VALUES ('ws_artriyum', 'artriyum', unixepoch());
--> statement-breakpoint
ALTER TABLE `users` ADD `workspace_id` text NOT NULL REFERENCES workspaces(id) DEFAULT 'ws_artriyum';
--> statement-breakpoint
ALTER TABLE `accounts` ADD `workspace_id` text NOT NULL REFERENCES workspaces(id) DEFAULT 'ws_artriyum';
--> statement-breakpoint
CREATE INDEX `users_workspace_idx` ON `users` (`workspace_id`);
--> statement-breakpoint
CREATE INDEX `accounts_workspace_idx` ON `accounts` (`workspace_id`);
