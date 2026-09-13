-- Only needed when TypeORM schema synchronization is disabled.
-- Adds batch storage without modifying questions, answers, photos or learning history.
CREATE TABLE IF NOT EXISTS `question_excel_batch` (
  `id` varchar(36) NOT NULL,
  `adminId` bigint NOT NULL,
  `expiresAt` datetime NOT NULL,
  `rows` json NOT NULL,
  `result` json DEFAULT NULL,
  `committedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `IDX_question_excel_batch_expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
