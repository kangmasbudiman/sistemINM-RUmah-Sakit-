import { IndicatorDetailPage } from "@/components/pages/indicator-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <IndicatorDetailPage
      id={id}
      listBasePath="/imk/indikator"
      inputBasePath="/imk/input"
    />
  );
}
