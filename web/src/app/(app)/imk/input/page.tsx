import { InputPage } from "@/components/pages/input-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ indicator?: string }>;
}) {
  return (
    <InputPage
      category="IMK"
      inputBasePath="/imk/input"
      dashboardBasePath="/imk/dashboard"
      searchParams={searchParams}
    />
  );
}
