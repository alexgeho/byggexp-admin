import { useEffect, useState } from 'react';
import { Form, Input, Select, Upload, message } from 'antd';
import {
  CameraOutlined,
  FolderOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import AdminFormField from '@/src/shared/components/AdminFormField';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useToolStore } from '@/src/store/toolStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const { TextArea } = Input;
const { Option } = Select;

export default function ToolCreateForm({ onClose, toolToEdit = null }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const createTool = useToolStore((state) => state.create);
  const updateTool = useToolStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());

  useEffect(() => {
    const fetchData = async () => {
      try {
        let projectsData = [];
        let workersData = [];

        if (isSuperAdmin) {
          const [projectsRes, usersRes] = await Promise.all([
            apiClient.get('/projects'),
            apiClient.get('/users'),
          ]);
          projectsData = projectsRes.data;
          workersData = usersRes.data.filter((item) => item.role === 'worker');
        } else if (isCompanyAdmin && user?.companyId) {
          const [projectsRes, usersRes] = await Promise.all([
            apiClient.get(`/projects/company/${user.companyId}`),
            apiClient.get(`/users/company/${user.companyId}`),
          ]);
          projectsData = projectsRes.data;
          workersData = usersRes.data.filter((item) => item.role === 'worker');
        } else {
          const [projectsRes, usersRes] = await Promise.all([
            apiClient.get('/projects/my'),
            apiClient.get('/users/role/worker'),
          ]);
          projectsData = projectsRes.data;
          workersData = usersRes.data;
        }

        setProjects(projectsData);
        setWorkers(workersData);
      } catch (err) {
        console.error('Failed to fetch data for tool form:', err);
        message.warning(formatApiError(err, 'Failed to load form data'));
      }
    };

    fetchData();
  }, [isSuperAdmin, isCompanyAdmin, user]);

  useEffect(() => {
    if (toolToEdit) {
      form.setFieldsValue({
        name: toolToEdit.name,
        notes: toolToEdit.notes,
        workerIds: toolToEdit.workerIds || [],
        projectIds: toolToEdit.projectIds || [],
      });
      setPhotoFile(null);
    } else {
      form.resetFields();
      setPhotoFile(null);
    }
  }, [toolToEdit, form]);

  const onFinish = async (values) => {
    const formData = new FormData();
    formData.append('name', values.name.trim());

    if (values.notes?.trim()) {
      formData.append('notes', values.notes.trim());
    }

    if (values.workerIds?.length) {
      formData.append('workerIds', JSON.stringify(values.workerIds));
    }

    if (values.projectIds?.length) {
      formData.append('projectIds', JSON.stringify(values.projectIds));
    }

    if (photoFile) {
      formData.append('photo', photoFile);
    }

    try {
      if (toolToEdit) {
        const toolId = getEntityId(toolToEdit);
        if (!toolId) {
          throw new Error('Tool id is missing');
        }
        await updateTool(toolId, formData);
      } else {
        await createTool(formData);
      }

      onClose();
      form.resetFields();
      setPhotoFile(null);
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save tool'));
    }
  };

  return (
    <Form
      id="tool-create-form"
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="project-create-form__group">
        <AdminFormField
          name="name"
          label="Name"
          fieldLabel="Name *"
          rules={[{ required: true, message: 'Please enter tool name' }]}
        >
          <Input placeholder="Tool name" />
        </AdminFormField>

        <AdminFormField
          label="Photo"
          fieldLabel="Add photo"
          icon={<CameraOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
        >
          <Upload
            accept="image/*"
            maxCount={1}
            beforeUpload={(file) => {
              setPhotoFile(file);
              return false;
            }}
            onRemove={() => setPhotoFile(null)}
            fileList={
              photoFile
                ? [{ uid: '-1', name: photoFile.name, status: 'done' }]
                : []
            }
          >
            <button type="button" className="btn-light">
              Select photo
            </button>
          </Upload>
        </AdminFormField>
      </div>

      <div className="project-create-form__group">
        <AdminFormField
          name="workerIds"
          label="Workers"
          fieldLabel="Attach to workers"
          icon={<TeamOutlined />}
        >
          <Select
            variant="borderless"
            mode="multiple"
            className="project-create-form__select project-create-form__select--multiple"
            placeholder="Select workers"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {workers.map((worker) => (
              <Option key={getEntityId(worker)} value={getEntityId(worker)}>
                {worker.name || worker.email}
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="projectIds"
          label="Projects"
          fieldLabel="Attach to projects"
          icon={<FolderOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
        >
          <Select
            variant="borderless"
            mode="multiple"
            className="project-create-form__select project-create-form__select--multiple"
            placeholder="Select projects"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {projects.map((project) => (
              <Option key={getEntityId(project)} value={getEntityId(project)}>
                {project.name}
              </Option>
            ))}
          </Select>
        </AdminFormField>
      </div>

      <div className="project-create-form__group project-create-form__note-group">
        <AdminFormField layout="note" name="notes" label="Notes" fieldLabel="Notes">
          <TextArea rows={4} placeholder="Add notes" />
        </AdminFormField>
      </div>
    </Form>
  );
}
