-- DropForeignKey
ALTER TABLE `Indicator` DROP FOREIGN KEY `Indicator_unitId_fkey`;

-- DropIndex
DROP INDEX `Indicator_unitId_code_key` ON `Indicator`;

-- AlterTable
ALTER TABLE `Analysis` ADD COLUMN `validatedAt` DATETIME(3) NULL,
    ADD COLUMN `validatedById` VARCHAR(191) NULL,
    ADD COLUMN `validationNote` TEXT NULL,
    MODIFY `status` ENUM('DRAFT', 'SUBMITTED', 'VALIDATED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `Indicator` ADD COLUMN `category` ENUM('INM', 'IMP', 'IMP_RS') NOT NULL DEFAULT 'INM';

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'KOMITE_MUTU', 'DIREKTUR', 'PIC_UNIT', 'DATA_COLLECTOR', 'VALIDATOR') NOT NULL DEFAULT 'DATA_COLLECTOR';

-- CreateTable
CREATE TABLE `SiteSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `brandIcon` VARCHAR(191) NOT NULL DEFAULT 'Activity',
    `brandTitle` VARCHAR(191) NOT NULL DEFAULT 'Sistem INM Rumah Sakit',
    `brandSubtitle` VARCHAR(191) NOT NULL DEFAULT 'Royal Prima Jambi · Indikator Mutu Nasional',
    `sideImageUrl` VARCHAR(191) NULL,
    `sideBadge` VARCHAR(191) NOT NULL DEFAULT 'RS Royal Prima Jambi',
    `sideHeadline` VARCHAR(191) NOT NULL DEFAULT 'Pemantauan Mutu Rumah Sakit',
    `sideParagraph` VARCHAR(191) NOT NULL DEFAULT 'Sistem pemantauan Indikator Mutu Nasional dan Prioritas untuk menjamin pelayanan yang aman, efektif, dan bermutu bagi setiap pasien.',
    `sideBullet1` VARCHAR(191) NOT NULL DEFAULT 'Indikator INM & IMP lintas unit',
    `sideBullet2` VARCHAR(191) NOT NULL DEFAULT 'Dashboard real-time & analisa PDSA',
    `sideBullet3` VARCHAR(191) NOT NULL DEFAULT 'Workflow approval Komite Mutu',
    `footerText` VARCHAR(191) NOT NULL DEFAULT '© Tim Mutu RS Royal Prima Jambi',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Indicator_category_idx` ON `Indicator`(`category`);

-- CreateIndex
CREATE UNIQUE INDEX `Indicator_category_unitId_code_key` ON `Indicator`(`category`, `unitId`, `code`);

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `Indicator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

