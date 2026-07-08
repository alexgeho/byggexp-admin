import { useEffect, useState } from 'react';
import { Form, Upload, message } from 'antd';
import { Field, Input, Select, Textarea, Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useToolStore } from '@/src/store/toolStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

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

  const workerOptions = workers.map((worker) => ({
    value: getEntityId(worker),
    label: worker.name || worker.email,
  }));

  const projectOptions = projects.map((project) => ({
    value: getEntityId(project),
    label: project.name,
  }));

  return (
    <Form
      id="tool-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter tool name' }]}
          >
            <Input placeholder="Tool name" />
          </Field>

          <Field label="Photo">
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
              <Button variant="secondary">Select photo</Button>
            </Upload>
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field name="workerIds" label="Workers">
            <Select
              mode="multiple"
              placeholder="Select workers"
              options={workerOptions}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="projectIds" label="Projects">
            <Select
              mode="multiple"
              placeholder="Select projects"
              options={projectOptions}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label="Notes">
              <Textarea rows={4} placeholder="Add notes" />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
