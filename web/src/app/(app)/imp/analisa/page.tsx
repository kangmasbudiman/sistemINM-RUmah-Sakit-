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
      category="IMP"
      basePath="/imp/analisa"
      inputBasePath="/imp/input"
      searchParams={searchParams}
    />
  );
}
