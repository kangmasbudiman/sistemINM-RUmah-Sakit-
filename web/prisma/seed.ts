import { PrismaClient, UserRole, IndicatorCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type UnitSeed = {
  code: string;
  name: string;
  description: string;
  orderNo: number;
  indicators: {
    code: string;
    title: string;
    numeratorLabel: string;
    denominatorLabel: string;
    targetPct: number;
    orderNo: number;
    category?: IndicatorCategory; // default INM
  }[];
};

// Master data hasil parsing SENSUS INM.xlsx — RS Royal Prima Jambi 2026
const UNITS: UnitSeed[] = [
  {
    code: "FARMASI",
    name: "Instalasi Farmasi",
    description: "Unit pelayanan farmasi rumah sakit",
    orderNo: 1,
    indicators: [
      {
        code: "FARMASI-01",
        title: "Kepatuhan Penggunaan Formularium Nasional",
        numeratorLabel:
          "Jumlah R/ recipe dalam lembar resep yang sesuai dengan formularium nasional",
        denominatorLabel: "Jumlah R/ recipe dalam lembar resep yang diobservasi",
        targetPct: 100,
        orderNo: 1,
      },
    ],
  },
  {
    code: "OK",
    name: "Kamar Operasi (OK)",
    description: "Unit pelayanan kamar operasi",
    orderNo: 2,
    indicators: [
      {
        code: "OK-01",
        title: "Waktu Tanggap Operasi Seksio Sesaria Emergensi",
        numeratorLabel:
          "Jumlah pasien yang diputuskan tindakan SC, emergensi yang mendapatkan tindakan SC ≤ 30 menit",
        denominatorLabel:
          "Jumlah pasien yang diputuskan tindakan seksio sesarea emergensi",
        targetPct: 100,
        orderNo: 1,
      },
      {
        code: "OK-02",
        title: "Penundaan Operasi Elektif",
        numeratorLabel:
          "Jumlah pasien yang jadwal operasinya tertunda lebih dari 1 jam",
        denominatorLabel: "Jumlah pasien operasi elektif",
        targetPct: 0,
        orderNo: 2,
      },
    ],
  },
  {
    code: "RAWAT_INAP",
    name: "Rawat Inap",
    description: "Unit pelayanan rawat inap",
    orderNo: 3,
    indicators: [
      {
        code: "RI-01",
        title: "Kepatuhan Identifikasi Pasien",
        numeratorLabel:
          "Jumlah pemberi pelayanan yang melakukan identifikasi pasien secara benar dalam periode observasi",
        denominatorLabel:
          "Jumlah pemberi pelayanan yang diobservasi dalam periode observasi",
        targetPct: 100,
        orderNo: 1,
      },
      {
        code: "RI-02",
        title: "Kepatuhan Waktu Visite Dokter",
        numeratorLabel: "Jumlah pasien yang di visite dokter pukul 06.00–14.00",
        denominatorLabel: "Jumlah pasien yang diobservasi",
        targetPct: 100,
        orderNo: 2,
      },
      {
        code: "RI-03",
        title: "Kepatuhan Upaya Pencegahan Risiko Pasien Jatuh",
        numeratorLabel:
          "Jumlah pasien rawat inap berisiko tinggi jatuh yang mendapatkan ketiga upaya pencegahan risiko jatuh",
        denominatorLabel:
          "Jumlah pasien rawat inap berisiko tinggi jatuh yang diobservasi",
        targetPct: 100,
        orderNo: 3,
      },
    ],
  },
  {
    code: "LABORATORIUM",
    name: "Laboratorium",
    description: "Unit pelayanan laboratorium",
    orderNo: 4,
    indicators: [
      {
        code: "LAB-01",
        title: "Pelaporan Hasil Kritis Laboratorium",
        numeratorLabel: "Jumlah hasil kritis laboratorium yang dilaporkan ≤ 30 menit",
        denominatorLabel: "Jumlah hasil kritis laboratorium yang diobservasi",
        targetPct: 100,
        orderNo: 1,
      },
    ],
  },
  {
    code: "POLIKLINIK",
    name: "Poliklinik",
    description: "Unit pelayanan rawat jalan / poliklinik",
    orderNo: 5,
    indicators: [
      {
        code: "POLI-01",
        title: "Waktu Tunggu Rawat Jalan",
        numeratorLabel: "Jumlah pasien rawat jalan dengan waktu tunggu ≤ 60 menit",
        denominatorLabel: "Jumlah pasien rawat jalan yang diobservasi",
        targetPct: 100,
        orderNo: 1,
      },
    ],
  },
  {
    code: "PIPP",
    name: "Penanganan Investigasi Pelaporan Pengaduan Pasien (PIPP)",
    description: "Unit pengaduan & komplain pasien",
    orderNo: 6,
    indicators: [
      {
        code: "PIPP-01",
        title: "Kecepatan Waktu Tanggap Komplain",
        numeratorLabel:
          "Jumlah komplain yang ditanggapi dan ditindaklanjuti sesuai waktu yang ditetapkan berdasarkan grading",
        denominatorLabel: "Jumlah komplain yang disurvei",
        targetPct: 100,
        orderNo: 1,
      },
    ],
  },
  {
    code: "KABID",
    name: "Kepatuhan Alur Klinis (Clinical Pathway)",
    description: "Koordinator bidang / clinical pathway",
    orderNo: 7,
    indicators: [
      {
        code: "CP-01",
        title: "Kepatuhan Terhadap Alur Klinis (Clinical Pathway)",
        numeratorLabel:
          "Jumlah pelayanan oleh PPA yang sesuai dengan clinical pathway",
        denominatorLabel:
          "Jumlah seluruh pelayanan oleh PPA pada clinical pathway yang diobservasi",
        targetPct: 100,
        orderNo: 1,
      },
    ],
  },
  {
    code: "PPI",
    name: "Pencegahan & Pengendalian Infeksi (PPI)",
    description: "Unit pencegahan pengendalian infeksi",
    orderNo: 8,
    indicators: [
      {
        code: "PPI-01",
        title: "Kepatuhan Kebersihan Tangan (Hand Hygiene)",
        numeratorLabel: "Jumlah tindakan kebersihan tangan yang dilakukan",
        denominatorLabel:
          "Jumlah total peluang kebersihan tangan yang seharusnya dilakukan dalam periode observasi",
        targetPct: 100,
        orderNo: 1,
      },
      {
        code: "PPI-02",
        title: "Kepatuhan Penggunaan Alat Pelindung Diri (APD)",
        numeratorLabel:
          "Jumlah petugas yang patuh menggunakan APD sesuai indikasi dalam periode observasi",
        denominatorLabel:
          "Jumlah seluruh petugas yang terindikasi menggunakan APD dalam periode observasi",
        targetPct: 100,
        orderNo: 2,
      },
    ],
  },
];

// ─── IMP (Indikator Mutu Prioritas) ─────────────────────────────────────
// Di-seed sebagai unit + indikator dengan category=IMP.
// Unit baru khusus IMP; unit yang sudah dipakai INM (FARMASI, OK, RAWAT_INAP, PPI)
// dipakai ulang dengan kode indikator berprefix IMP- agar tidak tabrakan.
const IMP_NEW_UNITS: UnitSeed[] = [
  {
    code: "ICU",
    name: "Intensive Care Unit (ICU)",
    description: "Unit Perawatan Intensif",
    orderNo: 100,
    indicators: [
      {
        code: "IMP-ICU-01",
        title: "Persentase Tindakan Kolektif atas Hasil Risk Register",
        numeratorLabel:
          "Jumlah rencana aksi mitigasi dalam risk register yang telah selesai dilaksanakan (tuntas)",
        denominatorLabel:
          "Jumlah total rencana aksi mitigasi yang terdaftar dalam risk register",
        targetPct: 80,
        orderNo: 1,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    code: "REKAM_MEDIK",
    name: "Rekam Medik (ERM)",
    description: "Unit Rekam Medik / Elektronic Medical Record",
    orderNo: 101,
    indicators: [
      {
        code: "IMP-RM-01",
        title: "Kepatuhan Karyawan dalam Pengisian E-RM",
        numeratorLabel:
          "Jumlah berkas E-RM pasien yang terisi lengkap, benar, dan tepat waktu oleh PPA",
        denominatorLabel: "Jumlah total berkas E-RM yang seharusnya terisi",
        targetPct: 80,
        orderNo: 1,
        category: IndicatorCategory.IMP,
      },
      {
        code: "IMP-RM-02",
        title: "Peningkatan Jumlah BOR (Bed Occupancy Rate) 65-85%",
        numeratorLabel: "Jumlah Hari Perawatan (HP) dalam satu periode bulan",
        denominatorLabel:
          "Jumlah Tempat Tidur Tersedia × Jumlah Hari dalam satu periode",
        targetPct: 75,
        orderNo: 2,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    code: "RAJAL_IGD_PENUNJANG",
    name: "Rawat Jalan, IGD, dan Penunjang",
    description: "Unit gabungan Rawat Jalan, IGD, dan Penunjang Medik",
    orderNo: 102,
    indicators: [
      {
        code: "IMP-RJL-01",
        title: "Ketidaktepatan Identifikasi Pasien",
        numeratorLabel:
          "Jumlah insiden kesalahan identifikasi pasien yang ditemukan dalam satu bulan",
        denominatorLabel:
          "Jumlah seluruh pasien yang mendapatkan pelayanan di rumah sakit pada bulan yang sama",
        targetPct: 80,
        orderNo: 1,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    code: "INSTALASI_GIZI",
    name: "Instalasi Gizi",
    description: "Unit Instalasi Gizi / Dapur Rumah Sakit",
    orderNo: 103,
    indicators: [
      {
        code: "IMP-GZI-01",
        title: "Kepatuhan Ruang Pengolahan Bebas dari Serangga",
        numeratorLabel:
          "Jumlah hari dalam satu bulan di mana ruang pengolahan dinyatakan 100% bebas dari serangga berdasarkan hasil monitoring harian",
        denominatorLabel: "Jumlah seluruh hari dalam bulan tersebut (30 atau 31 hari)",
        targetPct: 100,
        orderNo: 1,
        category: IndicatorCategory.IMP,
      },
    ],
  },
];

// IMP indicators untuk unit yang SUDAH ada (FARMASI, OK, RAWAT_INAP, PPI)
// — gunakan kode berprefix IMP- agar unik dengan INM di unit yg sama.
const IMP_INDICATORS_EXISTING_UNITS: {
  unitCode: string;
  indicators: UnitSeed["indicators"];
}[] = [
  {
    unitCode: "FARMASI",
    indicators: [
      {
        code: "IMP-FARMASI-01",
        title: "Pelaksanaan Double Check pada Obat High Alert",
        numeratorLabel:
          "Jumlah pemberian obat high alert yang dilakukan double check secara lengkap dan didokumentasikan (ada bukti paraf/tanda tangan dua petugas)",
        denominatorLabel: "Jumlah total seluruh pemberian obat high alert",
        targetPct: 100,
        orderNo: 100,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    unitCode: "OK",
    indicators: [
      {
        code: "IMP-OK-01",
        title:
          "Kepatuhan Pelaksanaan Surgical Safety Checklist (Sign In, Time Out, Sign Out)",
        numeratorLabel:
          "Jumlah tindakan pembedahan yang melaksanakan SSC secara lengkap (Sign-In, Time-Out, dan Sign-Out)",
        denominatorLabel:
          "Jumlah total seluruh tindakan pembedahan di kamar operasi",
        targetPct: 100,
        orderNo: 100,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    unitCode: "PPI",
    indicators: [
      {
        code: "IMP-PPI-01",
        title: "Kepatuhan Penggunaan Alat Pelindung Diri (APD)",
        numeratorLabel:
          "Jumlah petugas yang patuh menggunakan APD sesuai indikasi dalam periode observasi",
        denominatorLabel:
          "Jumlah seluruh petugas yang terindikasi menggunakan APD dalam periode observasi",
        targetPct: 100,
        orderNo: 100,
        category: IndicatorCategory.IMP,
      },
    ],
  },
  {
    unitCode: "RAWAT_INAP",
    indicators: [
      {
        code: "IMP-RI-01",
        title: "Kepatuhan Penggunaan Penyangga Tempat Tidur",
        numeratorLabel:
          "Pasien berisiko jatuh yang diobservasi dengan penyangga tempat tidur terpasang dengan benar",
        denominatorLabel: "Jumlah total pasien berisiko jatuh yang diobservasi",
        targetPct: 100,
        orderNo: 100,
        category: IndicatorCategory.IMP,
      },
      {
        code: "IMP-RI-02",
        title:
          "Kepatuhan Petugas Ahli Gizi dalam Memberikan Edukasi Diit DM di Rawat Inap",
        numeratorLabel:
          "Pasien DM rawat inap yang mendapatkan edukasi gizi secara lengkap dan terdokumentasi",
        denominatorLabel:
          "Total pasien dengan diagnosa DM (baik primer maupun sekunder) yang dirawat",
        targetPct: 100,
        orderNo: 101,
        category: IndicatorCategory.IMP,
      },
      {
        code: "IMP-RI-03",
        title: "Kepatuhan Pemberian Informasi dan Edukasi",
        numeratorLabel:
          "Jumlah pasien yang mendapatkan informasi dan edukasi secara lengkap serta terdokumentasi (tanda tangan nakes & pasien)",
        denominatorLabel:
          "Jumlah total pasien yang mendapatkan pelayanan di unit tersebut",
        targetPct: 100,
        orderNo: 102,
        category: IndicatorCategory.IMP,
      },
    ],
  },
];

// ─── IMP RS (Indikator Mutu Prioritas RS — level rumah sakit) ──────────
// Sumber: FORM SENSUS IMP RS 2026.xlsx (4 sheet IMP RS).
// Dipisahkan dari IMP Unit karena scope-nya rumah sakit (bukan per unit).
const IMP_RS_INDICATORS: {
  unitCode: string;
  indicators: UnitSeed["indicators"];
}[] = [
  {
    // Sheet: RM
    unitCode: "REKAM_MEDIK",
    indicators: [
      {
        code: "IMPRS-RM-01",
        title: "Peningkatan Jumlah BOR (Bed Occupancy Rate) 65-85%",
        numeratorLabel:
          "Jumlah Hari Perawatan (HP) dalam satu periode bulan",
        denominatorLabel:
          "Jumlah Tempat Tidur Tersedia × Jumlah Hari dalam satu periode",
        // Target range 65-85%; kita pakai 75 sebagai target tunggal.
        targetPct: 75,
        orderNo: 200,
        category: IndicatorCategory.IMP_RS,
      },
    ],
  },
  {
    // Sheet: RAJAL-RANP-IGD DAN PENUNJANG
    unitCode: "RAJAL_IGD_PENUNJANG",
    indicators: [
      {
        code: "IMPRS-RJL-01",
        title: "Ketidaktepatan Identifikasi Pasien",
        numeratorLabel:
          "Jumlah insiden kesalahan identifikasi pasien yang ditemukan dalam satu bulan",
        denominatorLabel:
          "Jumlah seluruh pasien yang mendapatkan pelayanan di rumah sakit pada bulan yang sama",
        targetPct: 80,
        orderNo: 200,
        category: IndicatorCategory.IMP_RS,
      },
    ],
  },
  {
    // Sheet: RANAP-GIZI
    unitCode: "RAWAT_INAP",
    indicators: [
      {
        code: "IMPRS-GZI-01",
        title: "Kepatuhan Pemberian Informasi dan Edukasi (Ranap-Gizi)",
        numeratorLabel:
          "Jumlah pasien yang mendapatkan informasi dan edukasi secara lengkap serta terdokumentasi (tanda tangan nakes & pasien)",
        denominatorLabel:
          "Jumlah total pasien yang mendapatkan pelayanan di unit tersebut",
        targetPct: 100,
        orderNo: 200,
        category: IndicatorCategory.IMP_RS,
      },
    ],
  },
  {
    // Sheet: FARMASI
    unitCode: "FARMASI",
    indicators: [
      {
        code: "IMPRS-FARMASI-01",
        title: "Pelaksanaan Double Check pada Obat High Alert",
        numeratorLabel:
          "Jumlah pemberian obat high alert yang dilakukan double check secara lengkap dan didokumentasikan (ada bukti paraf/tanda tangan dua petugas)",
        denominatorLabel: "Jumlah total seluruh pemberian obat high alert",
        targetPct: 100,
        orderNo: 200,
        category: IndicatorCategory.IMP_RS,
      },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding INM units & indicators...");

  // Upsert units + indicators (INM)
  for (const u of UNITS) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name, description: u.description, orderNo: u.orderNo },
      create: {
        code: u.code,
        name: u.name,
        description: u.description,
        orderNo: u.orderNo,
      },
    });

    for (const ind of u.indicators) {
      await prisma.indicator.upsert({
        where: {
          category_unitId_code: {
            category: IndicatorCategory.INM,
            unitId: unit.id,
            code: ind.code,
          },
        },
        update: {
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
        create: {
          unitId: unit.id,
          category: IndicatorCategory.INM,
          code: ind.code,
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
      });
    }
    console.log(`  ✓ ${u.code} — ${u.indicators.length} indikator INM`);
  }

  console.log("\n🌱 Seeding IMP (Indikator Mutu Prioritas)...");

  // IMP: new units first
  for (const u of IMP_NEW_UNITS) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: { name: u.name, description: u.description, orderNo: u.orderNo },
      create: {
        code: u.code,
        name: u.name,
        description: u.description,
        orderNo: u.orderNo,
      },
    });

    for (const ind of u.indicators) {
      await prisma.indicator.upsert({
        where: {
          category_unitId_code: {
            category: IndicatorCategory.IMP,
            unitId: unit.id,
            code: ind.code,
          },
        },
        update: {
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
        create: {
          unitId: unit.id,
          category: IndicatorCategory.IMP,
          code: ind.code,
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
      });
    }
    console.log(`  ✓ ${u.code} — ${u.indicators.length} indikator IMP`);
  }

  // IMP: indicators in existing units (FARMASI, OK, PPI, RAWAT_INAP)
  for (const group of IMP_INDICATORS_EXISTING_UNITS) {
    const unit = await prisma.unit.findUnique({ where: { code: group.unitCode } });
    if (!unit) {
      console.warn(`  ⚠ unit ${group.unitCode} tidak ditemukan, skip`);
      continue;
    }
    for (const ind of group.indicators) {
      await prisma.indicator.upsert({
        where: {
          category_unitId_code: {
            category: IndicatorCategory.IMP,
            unitId: unit.id,
            code: ind.code,
          },
        },
        update: {
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
        create: {
          unitId: unit.id,
          category: IndicatorCategory.IMP,
          code: ind.code,
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
      });
    }
    console.log(`  ✓ ${group.unitCode} — +${group.indicators.length} indikator IMP`);
  }

  console.log("\n🌱 Seeding IMP RS (Indikator Mutu Prioritas RS)...");

  for (const group of IMP_RS_INDICATORS) {
    const unit = await prisma.unit.findUnique({ where: { code: group.unitCode } });
    if (!unit) {
      console.warn(`  ⚠ unit ${group.unitCode} tidak ditemukan, skip IMP_RS`);
      continue;
    }
    for (const ind of group.indicators) {
      await prisma.indicator.upsert({
        where: {
          category_unitId_code: {
            category: IndicatorCategory.IMP_RS,
            unitId: unit.id,
            code: ind.code,
          },
        },
        update: {
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
        create: {
          unitId: unit.id,
          category: IndicatorCategory.IMP_RS,
          code: ind.code,
          title: ind.title,
          numeratorLabel: ind.numeratorLabel,
          denominatorLabel: ind.denominatorLabel,
          targetPct: ind.targetPct,
          orderNo: ind.orderNo,
        },
      });
    }
    console.log(`  ✓ ${group.unitCode} — +${group.indicators.length} indikator IMP_RS`);
  }

  // Demo users
  console.log("\n🌱 Seeding demo users...");
  const pw = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@rsrpjambi.id" },
    update: {},
    create: {
      name: "Admin Sistem",
      email: "admin@rsrpjambi.id",
      passwordHash: pw,
      role: UserRole.ADMIN,
      nik: "0001",
    },
  });
  console.log("  ✓ admin@rsrpjambi.id / password123 (ADMIN)");

  const komite = await prisma.user.upsert({
    where: { email: "komite.mutu@rsrpjambi.id" },
    update: {},
    create: {
      name: "Komite Mutu RS",
      email: "komite.mutu@rsrpjambi.id",
      passwordHash: pw,
      role: UserRole.KOMITE_MUTU,
      nik: "0002",
    },
  });
  console.log("  ✓ komite.mutu@rsrpjambi.id / password123 (KOMITE_MUTU)");

  const direktur = await prisma.user.upsert({
    where: { email: "direktur@rsrpjambi.id" },
    update: {},
    create: {
      name: "Dr. Direktur RS",
      email: "direktur@rsrpjambi.id",
      passwordHash: pw,
      role: UserRole.DIREKTUR,
      nik: "0003",
      gelar: "Dr., Sp.PD., M.Kes",
    },
  });
  console.log("  ✓ direktur@rsrpjambi.id / password123 (DIREKTUR)");

  // PIC per unit (ambil unit pertama)
  for (const u of UNITS) {
    const unit = await prisma.unit.findUnique({ where: { code: u.code } });
    if (!unit) continue;
    await prisma.user.upsert({
      where: { email: `pic.${u.code.toLowerCase()}@rsrpjambi.id` },
      update: {},
      create: {
        name: `PIC ${u.name}`,
        email: `pic.${u.code.toLowerCase()}@rsrpjambi.id`,
        passwordHash: pw,
        role: UserRole.PIC_UNIT,
        unitId: unit.id,
        nik: `9${u.orderNo.toString().padStart(3, "0")}`,
      },
    });
    console.log(`  ✓ pic.${u.code.toLowerCase()}@rsrpjambi.id / password123 (PIC_UNIT — ${u.code})`);

    // Validator (Kepala Ruangan) per unit INM
    await prisma.user.upsert({
      where: { email: `validator.${u.code.toLowerCase()}@rsrpjambi.id` },
      update: {},
      create: {
        name: `Kepala Ruang ${u.name}`,
        email: `validator.${u.code.toLowerCase()}@rsrpjambi.id`,
        passwordHash: pw,
        role: UserRole.VALIDATOR,
        unitId: unit.id,
        nik: `8${u.orderNo.toString().padStart(3, "0")}`,
        gelar: "S.Kep, M.Kes",
      },
    });
    console.log(`  ✓ validator.${u.code.toLowerCase()}@rsrpjambi.id / password123 (VALIDATOR — ${u.code})`);
  }

  console.log("\n✅ Seed selesai.");
  console.log("\nDemo akun:");
  console.log("  admin@rsrpjambi.id          (lihat semua unit, kelola user)");
  console.log("  komite.mutu@rsrpjambi.id    (lihat semua unit, approve analisa)");
  console.log("  direktur@rsrpjambi.id       (dashboard executive lintas unit)");
  console.log("  pic.farmasi@rsrpjambi.id    (hanya FARMASI)");
  console.log("  pic.ppi@rsrpjambi.id        (hanya PPI)");
  console.log("  ... (8 PIC, satu per unit)");
  console.log("Password semua: password123");

  console.log("\n🌱 Seeding default SiteSetting (login page)...");
  await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      brandIcon: "Activity",
      brandTitle: "Sistem INM Rumah Sakit",
      brandSubtitle: "Royal Prima Jambi · Indikator Mutu Nasional",
      sideImageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&q=80",
      sideBadge: "RS Royal Prima Jambi",
      sideHeadline: "Pemantauan Mutu Rumah Sakit",
      sideParagraph:
        "Sistem pemantauan Indikator Mutu Nasional dan Prioritas untuk menjamin pelayanan yang aman, efektif, dan bermutu bagi setiap pasien.",
      sideBullet1: "Indikator INM & IMP lintas unit",
      sideBullet2: "Dashboard real-time & analisa PDSA",
      sideBullet3: "Workflow approval Komite Mutu",
      footerText: "© Tim Mutu RS Royal Prima Jambi",
    },
  });
  console.log("  ✓ SiteSetting (login page) — default created");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
