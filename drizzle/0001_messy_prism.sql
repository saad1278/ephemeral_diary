CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
