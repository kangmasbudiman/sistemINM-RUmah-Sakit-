import { IndikatorListPage } from "@/components/pages/indikator-list-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  return (
    <IndikatorListPage
      category="INM"
      basePath="/indikator"
      searchParams={searchParams}
    />
  );
}
