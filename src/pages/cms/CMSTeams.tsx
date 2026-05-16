import { LookupCMSPage } from '@/components/cms/LookupCMSPage';
const CMSTeams = () => (
  <LookupCMSPage
    table="teams"
    title="Teams"
    singular="Team"
    withDepartment
    leaderField={{ column: 'lead_user_id', label: 'Team Lead' }}
  />
);
export default CMSTeams;
