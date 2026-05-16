import { LookupCMSPage } from '@/components/cms/LookupCMSPage';
const CMSDepartments = () => (
  <LookupCMSPage
    table="departments"
    title="Departments"
    singular="Department"
    leaderField={{ column: 'head_user_id', label: 'Head of Department' }}
  />
);
export default CMSDepartments;
