-- AlterTable
ALTER TABLE `SiteSetting` ADD COLUMN `welcomeTitle` VARCHAR(120) NOT NULL DEFAULT 'Selamat datang',
    ADD COLUMN `welcomeSubtitle` VARCHAR(180) NOT NULL DEFAULT 'Masuk untuk mengakses dashboard pemantauan mutu.';
