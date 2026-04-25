import { SkeletonPage } from '@/components/SkeletonPage';
import { Receipt } from 'lucide-react';
const MyInvoices = () => <SkeletonPage title="My Invoices" description="View and download your payslips and invoices." icon={Receipt} />;
export default MyInvoices;
