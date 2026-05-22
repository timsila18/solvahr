import { CvServiceWizard } from "@/components/cv-service-wizard";
import { listCvServicePackages } from "@/lib/cv-service";

export default function CvServicePage() {
  return <CvServiceWizard packages={listCvServicePackages()} />;
}
