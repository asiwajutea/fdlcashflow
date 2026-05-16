import { LookupCMSPage } from '@/components/cms/LookupCMSPage';
const CMSProjects = () => (
  <LookupCMSPage
    table="projects"
    title="Projects"
    singular="Project"
    leaderField={{ column: 'lead_user_id', label: 'Project Lead' }}
  />
);
export default CMSProjects;
