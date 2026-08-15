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
      category="INM"
      basePath="/analisa"
      inputBasePath="/input"
      searchParams={searchParams}
    />
  );
}
