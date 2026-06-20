CREATE TABLE `achievements` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`icon` varchar(16) NOT NULL,
	`category` varchar(32) NOT NULL,
	`condition` text NOT NULL,
	`reward_exp` int NOT NULL DEFAULT 0,
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`achievement_id` varchar(36) NOT NULL,
	`game_id` varchar(36),
	`unlocked_at` varchar(32) NOT NULL,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` varchar(36) NOT NULL,
	`game_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`ai_persona` varchar(64),
	`slot_index` int NOT NULL,
	`role` varchar(32) NOT NULL,
	`is_alive` boolean NOT NULL,
	`is_mvp` boolean NOT NULL DEFAULT false,
	`survival_rounds` int NOT NULL DEFAULT 0,
	`correct_votes` int NOT NULL DEFAULT 0,
	`exp_gained` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `game_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_records` (
	`id` varchar(36) NOT NULL,
	`civilian_word` varchar(128) NOT NULL,
	`undercover_word` varchar(128) NOT NULL,
	`winner` varchar(32) NOT NULL,
	`total_rounds` int NOT NULL,
	`created_at` datetime NOT NULL,
	`finished_at` datetime NOT NULL,
	CONSTRAINT `game_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_rounds` (
	`id` varchar(36) NOT NULL,
	`game_id` varchar(36) NOT NULL,
	`round_number` int NOT NULL,
	`phase_order` text NOT NULL,
	`eliminated_slot` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `game_rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_speeches` (
	`id` varchar(36) NOT NULL,
	`round_id` varchar(36) NOT NULL,
	`slot_index` int NOT NULL,
	`content` text NOT NULL,
	`persona` varchar(64),
	`is_ai_generated` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `game_speeches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `persona_likes` (
	`persona_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `persona_monthly_limits` (
	`user_id` varchar(36) NOT NULL,
	`month` varchar(16) NOT NULL,
	`count` int NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`system_prompt` text NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`author_name` varchar(255) NOT NULL,
	`usage_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`is_public` boolean NOT NULL DEFAULT true,
	`created_at` int NOT NULL,
	`voice_name` varchar(64) DEFAULT '',
	`voice_pitch` int NOT NULL DEFAULT 100,
	`voice_rate` int NOT NULL DEFAULT 100,
	`voice_volume` int NOT NULL DEFAULT 100,
	CONSTRAINT `personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`username` varchar(255) NOT NULL,
	`nickname` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`avatar_url` varchar(255) DEFAULT '',
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`total_games` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`mvp_count` int NOT NULL DEFAULT 0,
	`undercover_wins` int NOT NULL DEFAULT 0,
	`survival_count` int NOT NULL DEFAULT 0,
	`correct_votes` int NOT NULL DEFAULT 0,
	`used_words_count` int NOT NULL DEFAULT 0,
	`win_streak` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `word_cache` (
	`id` varchar(36) NOT NULL,
	`civilian_word` varchar(128) NOT NULL,
	`undercover_word` varchar(128) NOT NULL,
	`theme` varchar(64) DEFAULT '',
	`difficulty` int NOT NULL DEFAULT 1,
	`usage_count` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `word_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievement_id_achievements_id_fk` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_players` ADD CONSTRAINT `game_players_game_id_game_records_id_fk` FOREIGN KEY (`game_id`) REFERENCES `game_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_rounds` ADD CONSTRAINT `game_rounds_game_id_game_records_id_fk` FOREIGN KEY (`game_id`) REFERENCES `game_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_speeches` ADD CONSTRAINT `game_speeches_round_id_game_rounds_id_fk` FOREIGN KEY (`round_id`) REFERENCES `game_rounds`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `persona_likes` ADD CONSTRAINT `persona_likes_persona_id_personas_id_fk` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE no action ON UPDATE no action;