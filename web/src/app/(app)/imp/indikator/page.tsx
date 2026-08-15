import { IndikatorListPage } from "@/components/pages/indikator-list-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  return (
    <IndikatorListPage
      category="IMP"
      basePath="/imp/indikator"
      searchParams={searchParams}
    />
  );
}
