-- AlterTable
ALTER TABLE `Indicator` MODIFY `category` ENUM('INM', 'IMP', 'IMP_RS', 'IMK') NOT NULL DEFAULT 'INM';
