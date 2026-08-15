import { InputPage } from "@/components/pages/input-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ indicator?: string }>;
}) {
  return (
    <InputPage
      category="IMP"
      inputBasePath="/imp/input"
      dashboardBasePath="/imp/dashboard"
      searchParams={searchParams}
    />
  );
}
