-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'KOMITE_MUTU', 'DIREKTUR', 'PIC_UNIT', 'DATA_COLLECTOR') NOT NULL DEFAULT 'DATA_COLLECTOR',
    `nik` VARCHAR(32) NULL,
    `gelar` VARCHAR(64) NULL,
    `unitId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_unitId_idx`(`unitId`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Unit` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `orderNo` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Unit_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Indicator` (
    `id` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `numeratorLabel` VARCHAR(191) NOT NULL,
    `denominatorLabel` VARCHAR(191) NOT NULL,
    `targetPct` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'DAILY',
    `orderNo` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Indicator_unitId_idx`(`unitId`),
    UNIQUE INDEX `Indicator_unitId_code_key`(`unitId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Observation` (
    `id` VARCHAR(191) NOT NULL,
    `indicatorId` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `observationDate` DATE NOT NULL,
    `numeratorValue` INTEGER NOT NULL DEFAULT 0,
    `denominatorValue` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Observation_unitId_observationDate_idx`(`unitId`, `observationDate`),
    UNIQUE INDEX `Observation_indicatorId_observationDate_key`(`indicatorId`, `observationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Analysis` (
    `id` VARCHAR(191) NOT NULL,
    `indicatorId` VARCHAR(191) NOT NULL,
    `unitId` VARCHAR(191) NOT NULL,
    `periodMonth` INTEGER NOT NULL,
    `periodYear` INTEGER NOT NULL,
    `analisaText` TEXT NULL,
    `pdsaPlan` TEXT NULL,
    `pdsaDo` TEXT NULL,
    `pdsaStudy` TEXT NULL,
    `pdsaAct` TEXT NULL,
    `dataCollector` VARCHAR(191) NULL,
    `picName` VARCHAR(191) NULL,
    `picNik` VARCHAR(32) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `rejectionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Analysis_unitId_periodYear_periodMonth_idx`(`unitId`, `periodYear`, `periodMonth`),
    INDEX `Analysis_status_idx`(`status`),
    UNIQUE INDEX `Analysis_indicatorId_periodMonth_periodYear_key`(`indicatorId`, `periodMonth`, `periodYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Indicator` ADD CONSTRAINT `Indicator_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Observation` ADD CONSTRAINT `Observation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
