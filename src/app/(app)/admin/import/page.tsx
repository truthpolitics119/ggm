import { requireAdmin } from "@/lib/auth";
import { CsvImport } from "@/components/csv-import";

export default async function ImportPage() {
  await requireAdmin();
  return <CsvImport/>;
}
