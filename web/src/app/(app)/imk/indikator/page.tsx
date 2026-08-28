import { IndikatorListPage } from "@/components/pages/indikator-list-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  return (
    <IndikatorListPage
      category="IMK"
      basePath="/imk/indikator"
      searchParams={searchParams}
    />
  );
}
