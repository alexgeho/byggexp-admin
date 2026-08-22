'use client';

import { useRef, useEffect } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, UnorderedListOutlined, OrderedListOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import './RichTextEditor.scss';

// Lightweight WYSIWYG for offer/invoice free-text fields (bold, bullet &
// numbered lists). Emits HTML; integrates with antd Form via value/onChange.
// The stored HTML is sanitised again on the server before it reaches the PDF.
export default function RichTextEditor({ value = '', onChange, placeholder }) {
  const t = useT();
  const ref = useRef(null);

  // Push incoming value into the DOM only when it actually differs, so typing
  // (which fires onChange → value) never resets the caret to the start.
  useEffect(() => {
    const html = value || '';
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [value]);

  const emit = () => onChange?.(ref.current?.innerHTML || '');

  const exec = (command) => {
    // document.execCommand is deprecated but still the simplest reliable way to
    // toggle bold/lists inside a contentEditable in Chromium (the admin runs in
    // Chrome / renders PDFs via headless Chrome).
    document.execCommand(command, false, null);
    emit();
    ref.current?.focus();
  };

  // onMouseDown + preventDefault keeps focus in the editable while the button
  // runs the command against the current selection.
  const tool = (command, icon, label) => (
    <Tooltip title={label}>
      <Button
        size="small"
        type="text"
        icon={icon}
        aria-label={label}
        onMouseDown={(e) => { e.preventDefault(); exec(command); }}
      />
    </Tooltip>
  );

  return (
    <div className="rte">
      <Space className="rte__toolbar" size={2}>
        {tool('bold', <BoldOutlined />, t('Bold'))}
        {tool('italic', <ItalicOutlined />, t('Italic'))}
        {tool('insertUnorderedList', <UnorderedListOutlined />, t('Bullet list'))}
        {tool('insertOrderedList', <OrderedListOutlined />, t('Numbered list'))}
      </Space>
      <div
        ref={ref}
        className="rte__editable"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder || ''}
      />
    </div>
  );
}
