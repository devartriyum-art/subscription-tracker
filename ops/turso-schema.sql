CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`email` text NOT NULL,
	`color` text DEFAULT '#2F6FED' NOT NULL,
	`note` text,
	`archived` integer DEFAULT false NOT NULL
);

CREATE TABLE `fx_rates` (
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`rate_try` real NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	PRIMARY KEY(`currency`, `date`)
);

CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`paid_on` text NOT NULL,
	`fx_rate_try` real,
	`note` text,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `payments_subscription_idx` ON `payments` (`subscription_id`);
CREATE TABLE `reminder_log` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`due_date` text NOT NULL,
	`days_before` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `reminder_unique_idx` ON `reminder_log` (`subscription_id`,`due_date`,`days_before`);
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`service` text NOT NULL,
	`plan` text,
	`category` text DEFAULT 'other' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`cycle` text DEFAULT 'monthly' NOT NULL,
	`anchor_date` text NOT NULL,
	`auto_renew` integer DEFAULT true NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL,
	`url` text,
	`note` text,
	`status` text DEFAULT 'active' NOT NULL,
	`cancelled_at` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);

CREATE INDEX `subscriptions_account_idx` ON `subscriptions` (`account_id`);
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);
CREATE TABLE `usage_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`percent` integer NOT NULL,
	`label` text,
	`note` text,
	`recorded_by` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);

CREATE INDEX `usage_subscription_idx` ON `usage_snapshots` (`subscription_id`);
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);-- Workspace izolasyonu. Mevcut veri tek bir "artriyum" workspace'ine taşınır.
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);

INSERT INTO `workspaces` (`id`, `name`, `created_at`)
VALUES ('ws_artriyum', 'artriyum', unixepoch());

ALTER TABLE `users` ADD `workspace_id` text NOT NULL REFERENCES workspaces(id) DEFAULT 'ws_artriyum';

ALTER TABLE `accounts` ADD `workspace_id` text NOT NULL REFERENCES workspaces(id) DEFAULT 'ws_artriyum';

CREATE INDEX `users_workspace_idx` ON `users` (`workspace_id`);

CREATE INDEX `accounts_workspace_idx` ON `accounts` (`workspace_id`);
