import { InputPage } from "@/components/pages/input-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ indicator?: string }>;
}) {
  return (
    <InputPage
      category="IMP_RS"
      inputBasePath="/imp-rs/input"
      dashboardBasePath="/imp-rs/dashboard"
      searchParams={searchParams}
    />
  );
}
