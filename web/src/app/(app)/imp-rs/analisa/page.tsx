import { AnalisaPage } from "@/components/pages/analisa-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    status?: string;
    unit?: string;
  }>;
}) {
  return (
    <AnalisaPage
      category="IMP_RS"
      basePath="/imp-rs/analisa"
      inputBasePath="/imp-rs/input"
      searchParams={searchParams}
    />
  );
}
