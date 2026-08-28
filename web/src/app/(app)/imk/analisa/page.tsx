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
      category="IMK"
      basePath="/imk/analisa"
      inputBasePath="/imk/input"
      searchParams={searchParams}
    />
  );
}
