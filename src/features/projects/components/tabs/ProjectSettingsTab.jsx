import { Empty } from 'antd';
import ProjectCreateForm from '@/src/features/projects/components/ProjectCreateForm';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';

export default function ProjectSettingsTab({ project, onSaved }) {
  return (
    <RoleBasedAccess
      allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}
      fallback={(
        <div className="project-settings-tab project-settings-tab--empty">
          <Empty
            description="You do not have permission to edit project settings"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}
    >
      <div className="project-settings-tab">
        <ProjectCreateForm
          projectToEdit={project}
          onClose={onSaved}
          showSubmitButton
        />
      </div>
    </RoleBasedAccess>
  );
}
