import { useEffect, useMemo, useState } from 'react';
import { Form, Upload, message } from 'antd';
import { Field, Input, Select, Textarea, Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useToolStore } from '@/src/store/toolStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { getToolPhotoUrls, resolveToolPhotoUrl } from '@/src/utils/toolPhotos';

const MAX_TOOL_PHOTOS = 20;

const buildPhotoItemsFromTool = (tool) => {
  if (!tool) {
    return [];
  }

  return getToolPhotoUrls(tool).map((url, index) => ({
    uid: `existing-${index}-${url}`,
    name: `Photo ${index + 1}`,
    status: 'done',
    url: resolveToolPhotoUrl(url),
    storedUrl: url,
    isExisting: true,
  }));
};

export default function ToolCreateForm({ onClose, toolToEdit = null }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [photoItems, setPhotoItems] = useState([]);
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
      setPhotoItems(buildPhotoItemsFromTool(toolToEdit));
      return;
    }

    form.resetFields();
    setPhotoItems([]);
  }, [toolToEdit, form]);

  const uploadFileList = useMemo(
    () => photoItems.map((item) => ({
      uid: item.uid,
      name: item.name,
      status: item.status,
      url: item.url,
    })),
    [photoItems],
  );

  const handlePhotoChange = ({ fileList }) => {
    setPhotoItems((currentItems) => {
      const nextItems = fileList.map((file) => {
        const existingItem = currentItems.find((item) => item.uid === file.uid);

        if (existingItem) {
          return existingItem;
        }

        return {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: file.originFileObj ? URL.createObjectURL(file.originFileObj) : file.url,
          file: file.originFileObj,
          isExisting: false,
        };
      });

      currentItems
        .filter((item) => !item.isExisting && item.url?.startsWith('blob:'))
        .forEach((item) => {
          if (!nextItems.some((nextItem) => nextItem.uid === item.uid)) {
            URL.revokeObjectURL(item.url);
          }
        });

      return nextItems;
    });
  };

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

    const existingPhotoUrls = photoItems
      .filter((item) => item.isExisting && item.storedUrl)
      .map((item) => item.storedUrl);

    formData.append('photoUrls', JSON.stringify(existingPhotoUrls));

    photoItems
      .filter((item) => item.file)
      .forEach((item) => {
        formData.append('photos', item.file);
      });

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
      setPhotoItems([]);
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

          <Field label="Photos">
            <Upload
              accept="image/*"
              multiple
              listType="picture-card"
              maxCount={MAX_TOOL_PHOTOS}
              beforeUpload={() => false}
              fileList={uploadFileList}
              onChange={handlePhotoChange}
            >
              {photoItems.length >= MAX_TOOL_PHOTOS ? null : (
                <Button variant="secondary">Add photos</Button>
              )}
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
