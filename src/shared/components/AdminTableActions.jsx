import { Button, Dropdown, Modal } from 'antd';
import { useAuthStore } from '@/src/store/authStore';

function ActionsDotsIcon() {
  return (
    <span className="admin-table-actions-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

const ACTIONS_COLUMN_WIDTH = 64;

export const getActionsColumnProps = () => ({
  title: '',
  width: ACTIONS_COLUMN_WIDTH,
  maxCellWidth: ACTIONS_COLUMN_WIDTH,
  ellipsis: false,
  align: 'center',
  headerSearch: false,
});

export default function AdminTableActions({ items = [] }) {
  const user = useAuthStore((state) => state.user);

  const visibleItems = items.filter((item) => {
    if (!item) {
      return false;
    }

    if (!item.roles) {
      return true;
    }

    const roles = Array.isArray(item.roles) ? item.roles : [item.roles];
    return Boolean(user?.role && roles.includes(user.role));
  });

  if (!visibleItems.length) {
    return null;
  }

  const toMenuItem = ({ confirmTitle, confirmOkText, confirmCancelText, onClick, children, ...item }) => ({
    ...item,
    ...(children?.length ? { children: children.map(toMenuItem) } : {}),
    ...(children?.length
      ? {}
      : {
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();

            if (confirmTitle) {
              Modal.confirm({
                title: confirmTitle,
                okText: confirmOkText,
                cancelText: confirmCancelText,
                okButtonProps: item.danger ? { danger: true } : undefined,
                onOk: onClick,
              });
              return;
            }

            onClick?.();
          },
        }),
  });

  const menuItems = visibleItems.map(toMenuItem);

  return (
    <div className="admin-table-actions">
      <Dropdown
        trigger={['click']}
        menu={{ items: menuItems }}
      >
        <Button
          type="text"
          className="admin-table-actions-button"
          aria-label="Open row actions"
          onClick={(event) => event.stopPropagation()}
        >
          <ActionsDotsIcon />
        </Button>
      </Dropdown>
    </div>
  );
}
