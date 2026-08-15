import { InputPage } from "@/components/pages/input-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ indicator?: string }>;
}) {
  return (
    <InputPage
      category="INM"
      inputBasePath="/input"
      dashboardBasePath="/dashboard"
      searchParams={searchParams}
    />
  );
}
