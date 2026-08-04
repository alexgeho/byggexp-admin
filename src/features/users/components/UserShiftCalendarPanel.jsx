import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, DatePicker, Dropdown, Spin, message } from 'antd';
import { LeftOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import exportIcon from '@/src/assets/icons/u_export.svg';
import { useHoursStore } from '@/src/store/hoursStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useT } from '@/src/i18n/LanguageProvider';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Reused from the Hours grid: Planned/GPS/Manual map to planned/actual/manual.
const BASIS_TABS = [
  { key: 'planned', label: 'Planned' },
  { key: 'actual', label: 'GPS' },
  { key: 'manual', label: 'Manual' },
];

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

const normalizeEntityId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id || value.id || '');
  }

  return String(value);
};

// Same derivation the Hours grid uses (src/features/shifts/HoursPage.jsx valOf).
const valueForBasis = (cell, basis) => {
  if (!cell) {
    return 0;
  }
  if (basis === 'planned') {
    return cell.planned ?? cell.actual ?? 0;
  }
  if (basis === 'manual') {
    return cell.manual ?? 0;
  }
  return cell.actual ?? 0;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getTodayDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) {
    return '';
  }

  const date = new Date(`${monthKey}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getAdjacentMonthKey = (monthKey, delta) => {
  if (!monthKey) {
    return monthKey;
  }

  const [year, month] = monthKey.split('-').map(Number);
  const nextDate = new Date(year, month - 1 + delta, 1);

  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
};

const getISOWeekNumber = (date) => {
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = normalizedDate.getDay() || 7;
  normalizedDate.setDate(normalizedDate.getDate() + 4 - dayNum);
  const yearStart = new Date(normalizedDate.getFullYear(), 0, 1);

  return Math.ceil(((normalizedDate - yearStart) / 86400000 + 1) / 7);
};

const getCalendarWeekNumber = (year, month, firstDayIndex, rowStartCellIndex) => {
  const mondayOffsetFromFirst = rowStartCellIndex - firstDayIndex;
  const mondayDate = new Date(year, month - 1, 1 + mondayOffsetFromFirst);

  return getISOWeekNumber(mondayDate);
};

const roundHours = (hours = 0) => Math.round((hours + Number.EPSILON) * 10) / 10;

const formatCalendarHours = (hours = 0) => {
  if (hours >= 1) {
    return `${Math.round(hours)}h`;
  }

  return `${roundHours(hours)}h`;
};

const formatTotalHours = (hours = 0) => `${roundHours(hours) || 0}h`;

const buildCalendarLayout = (monthKey) => {
  if (!monthKey) {
    return {
      columnDates: [],
      rowDates: [],
      rows: [],
    };
  }

  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, '0')}`);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const columnDates = Array.from({ length: 7 }, () => []);
  const rowDates = [];
  const rows = [];

  for (let rowIndex = 0; rowIndex < cells.length / 7; rowIndex += 1) {
    const rowStartIndex = rowIndex * 7;
    const rowCells = cells.slice(rowStartIndex, rowStartIndex + 7);
    const datesInRow = rowCells.filter(Boolean);

    rowCells.forEach((dateKey, columnIndex) => {
      if (dateKey) {
        columnDates[columnIndex].push(dateKey);
      }
    });

    rowDates.push(datesInRow);
    rows.push({
      rowIndex,
      weekNumber: getCalendarWeekNumber(year, month, firstDayIndex, rowStartIndex),
      cells: rowCells,
    });
  }

  return {
    columnDates,
    rowDates,
    rows,
  };
};

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

function SummaryStats({ totalHours, totalDays, selectedWorkers, exportSlot, t }) {
  return (
    <div className="user-shift-panel__summary">
      <div className="user-shift-panel__summary-stats">
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{totalHours}</span>
          <span className="user-shift-panel__summary-label">{t('Total')}</span>
        </div>
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{`${totalDays} ${t('days')}`}</span>
          <span className="user-shift-panel__summary-label">{t('Total')}</span>
        </div>
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{`${selectedWorkers} ${t('workers')}`}</span>
          <span className="user-shift-panel__summary-label">{t('Selected')}</span>
        </div>
      </div>

      {exportSlot}
    </div>
  );
}

export default function UserShiftCalendarPanel({
  selectedUsers = [],
  allUsers = [],
  projectId,
}) {
  const t = useT();
  const grid = useHoursStore((state) => state.grid);
  const gridLoading = useHoursStore((state) => state.loading);
  const fetchGrid = useHoursStore((state) => state.fetchGrid);
  const projectList = useProjectStore((state) => state.projects);

  const [activeTab, setActiveTab] = useState('calendar');
  const [basis, setBasis] = useState('actual');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [selectedDates, setSelectedDates] = useState([]);
  const [customFromDate, setCustomFromDate] = useState(() => dayjs().startOf('month'));
  const [customToDate, setCustomToDate] = useState(() => dayjs().endOf('month'));
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  // No explicit checkbox selection → count every visible worker for the shown period.
  const effectiveUsers = selectedUsers.length ? selectedUsers : allUsers;

  const projectNameById = useMemo(() => {
    const map = new Map();
    (projectList || []).forEach((project) => {
      map.set(normalizeEntityId(project?._id || project?.id), project?.name || project?.title);
    });
    return map;
  }, [projectList]);

  const range = useMemo(() => {
    if (activeTab === 'custom') {
      return {
        from: customFromDate ? customFromDate.format('YYYY-MM-DD') : null,
        to: customToDate ? customToDate.format('YYYY-MM-DD') : null,
      };
    }

    const from = `${selectedMonth}-01`;
    return {
      from,
      to: dayjs(from).endOf('month').format('YYYY-MM-DD'),
    };
  }, [activeTab, customFromDate, customToDate, selectedMonth]);

  // Pull the same hours grid the Shifts → Hours tool uses, scoped to the
  // list's project filter and the shown period.
  useEffect(() => {
    if (!range.from || !range.to) {
      return;
    }
    fetchGrid({ projectId: projectId || undefined, from: range.from, to: range.to });
  }, [fetchGrid, projectId, range.from, range.to]);

  const effectiveWorkerIds = useMemo(
    () => new Set(effectiveUsers.map((user) => normalizeEntityId(user?._id || user)).filter(Boolean)),
    [effectiveUsers],
  );

  // date → { hours, rows:[{ workerId, name, projectId, date, hours }] }
  const dayMap = useMemo(() => {
    const map = new Map();

    (grid.workers || []).forEach((worker) => {
      if (!effectiveWorkerIds.has(normalizeEntityId(worker?.workerId))) {
        return;
      }

      Object.entries(worker.cells || {}).forEach(([date, cell]) => {
        const hours = valueForBasis(cell, basis) || 0;
        if (!hours) {
          return;
        }

        const current = map.get(date) || { hours: 0, rows: [] };
        current.hours += hours;
        current.rows.push({
          workerId: worker.workerId,
          name: worker.name,
          projectId: cell.projectId,
          date,
          hours,
        });
        map.set(date, current);
      });
    });

    return map;
  }, [grid, effectiveWorkerIds, basis]);

  const monthShiftDates = useMemo(
    () => Array.from(dayMap.keys()).filter((dateKey) => dateKey.startsWith(selectedMonth)).sort(),
    [dayMap, selectedMonth],
  );

  const calendarLayout = useMemo(() => buildCalendarLayout(selectedMonth), [selectedMonth]);

  useEffect(() => {
    setSelectedDates((previousDates) =>
      previousDates.filter((dateKey) => dateKey.startsWith(selectedMonth)),
    );
  }, [selectedMonth]);

  const toggleDateGroup = useCallback((dates) => {
    if (!dates.length) {
      return;
    }

    setSelectedDates((previousDates) => {
      const allSelected = dates.every((date) => previousDates.includes(date));

      if (allSelected) {
        return previousDates.filter((date) => !dates.includes(date));
      }

      return Array.from(new Set([...previousDates, ...dates])).sort();
    });
  }, []);

  const calendarSummary = useMemo(() => {
    const activeDates = selectedDates.length ? selectedDates : monthShiftDates;
    const totalHours = activeDates.reduce(
      (sum, dateKey) => sum + (dayMap.get(dateKey)?.hours || 0),
      0,
    );

    return {
      totalHours,
      totalDays: activeDates.length,
      activeDates,
    };
  }, [dayMap, monthShiftDates, selectedDates]);

  const customSummary = useMemo(() => {
    const activeDates = Array.from(dayMap.keys()).sort();
    const totalHours = activeDates.reduce(
      (sum, dateKey) => sum + (dayMap.get(dateKey)?.hours || 0),
      0,
    );

    return {
      totalHours,
      totalDays: activeDates.length,
      activeDates,
    };
  }, [dayMap]);

  const basisLabel = useMemo(
    () => t(BASIS_TABS.find((tab) => tab.key === basis)?.label || 'GPS'),
    [basis, t],
  );

  const projectName = useCallback(
    (id) => projectNameById.get(normalizeEntityId(id)) || (id ? normalizeEntityId(id) : '-'),
    [projectNameById],
  );

  const buildExportRows = useCallback(() => {
    const activeDates = activeTab === 'calendar'
      ? calendarSummary.activeDates
      : customSummary.activeDates;

    const rows = [];
    activeDates.forEach((date) => {
      (dayMap.get(date)?.rows || []).forEach((row) => rows.push(row));
    });

    rows.sort((left, right) => (
      left.date.localeCompare(right.date)
      || String(left.name || '').localeCompare(String(right.name || ''))
    ));

    return rows;
  }, [activeTab, calendarSummary.activeDates, customSummary.activeDates, dayMap]);

  const exportFileBase = useCallback(
    () => `worker-hours-${basis}-${range.from}_${range.to}`,
    [basis, range.from, range.to],
  );

  const exportExcel = useCallback(async () => {
    const rows = buildExportRows();
    if (!rows.length) {
      message.info(t('No hours to export for the current selection.'));
      return;
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(t('Worker hours'));

    sheet.columns = [
      { header: t('Worker'), key: 'worker', width: 28 },
      { header: t('Project'), key: 'project', width: 26 },
      { header: t('Date'), key: 'date', width: 14 },
      { header: `${t('Hours')} (${basisLabel})`, key: 'hours', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    rows.forEach((row) => {
      sheet.addRow({
        worker: row.name || normalizeEntityId(row.workerId),
        project: projectName(row.projectId),
        date: row.date,
        hours: roundHours(row.hours),
      });
    });

    const totalHours = roundHours(rows.reduce((sum, row) => sum + row.hours, 0));
    sheet.addRow({});
    const totalRow = sheet.addRow({ worker: t('Total'), hours: totalHours });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${exportFileBase()}.xlsx`,
    );
  }, [basisLabel, buildExportRows, exportFileBase, projectName, t]);

  const exportPdf = useCallback(async () => {
    const rows = buildExportRows();
    if (!rows.length) {
      message.info(t('No hours to export for the current selection.'));
      return;
    }

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    const totalHours = roundHours(rows.reduce((sum, row) => sum + row.hours, 0));

    doc.setFontSize(14);
    doc.text(`${t('Worker hours')} — ${basisLabel}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`${range.from} – ${range.to}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [[t('Worker'), t('Project'), t('Date'), `${t('Hours')} (${basisLabel})`]],
      body: rows.map((row) => [
        row.name || normalizeEntityId(row.workerId),
        projectName(row.projectId),
        row.date,
        roundHours(row.hours),
      ]),
      foot: [[t('Total'), '', '', totalHours]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [7, 133, 244] },
      footStyles: { fillColor: [231, 236, 240], textColor: [5, 45, 80], fontStyle: 'bold' },
    });

    doc.save(`${exportFileBase()}.pdf`);
  }, [basisLabel, buildExportRows, exportFileBase, projectName, range.from, range.to, t]);

  const exportDisabled = !effectiveUsers.length;

  const exportSlot = (
    <Dropdown
      trigger={['click']}
      disabled={exportDisabled}
      menu={{
        items: [
          { key: 'excel', label: t('Export to Excel'), onClick: exportExcel },
          { key: 'pdf', label: t('Export to PDF'), onClick: exportPdf },
        ],
      }}
    >
      <Button
        type="primary"
        className="user-shift-panel__export-button"
        disabled={exportDisabled}
        icon={(
          <img
            src={resolveSvgSrc(exportIcon)}
            width={20}
            height={20}
            alt=""
            aria-hidden="true"
            className="user-shift-panel__export-icon"
          />
        )}
      >
        {t('Export')}
        <DownOutlined className="user-shift-panel__export-caret" />
      </Button>
    </Dropdown>
  );

  return (
    <aside className="user-shift-panel">
      <div className="user-shift-panel__card">
        <div className="user-shift-panel__card-header">
          <div className="user-shift-panel__basis" role="tablist" aria-label={t('Hours by')}>
            {BASIS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`user-shift-panel__basis-tab${basis === tab.key ? ' user-shift-panel__basis-tab--active' : ''}`}
                onClick={() => setBasis(tab.key)}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          <div className="user-shift-panel__tabs" role="tablist" aria-label={t('Shift period tabs')}>
            <button
              type="button"
              className={`user-shift-panel__tab${activeTab === 'calendar' ? ' user-shift-panel__tab--active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              {t('Calendar')}
            </button>
            <button
              type="button"
              className={`user-shift-panel__tab${activeTab === 'custom' ? ' user-shift-panel__tab--active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              {t('Custom period')}
            </button>
          </div>
        </div>

        <div className="user-shift-panel__card-body">
          <Spin spinning={gridLoading}>
            {activeTab === 'calendar' ? (
              <div className="user-shift-panel__content">
              <div className="user-shift-panel__month-bar">
                <button
                  type="button"
                  className="user-shift-panel__month-button"
                  onClick={() => setSelectedMonth((current) => getAdjacentMonthKey(current, -1))}
                  aria-label={t('Previous month')}
                >
                  <LeftOutlined />
                </button>

                <span className="user-shift-panel__month-label">{formatMonthLabel(selectedMonth)}</span>

                <button
                  type="button"
                  className="user-shift-panel__month-button"
                  onClick={() => setSelectedMonth((current) => getAdjacentMonthKey(current, 1))}
                  aria-label={t('Next month')}
                >
                  <RightOutlined />
                </button>
              </div>

              <div className="user-shift-panel__calendar">
                <div className="user-shift-panel__calendar-header">
                  <div className="user-shift-panel__calendar-week-spacer" />

                  <div className="user-shift-panel__calendar-days-header">
                    {WEEKDAY_LABELS.map((label, columnIndex) => (
                      <button
                        key={label}
                        type="button"
                        className="user-shift-panel__calendar-header-button"
                        onClick={() => toggleDateGroup(calendarLayout.columnDates[columnIndex] || [])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="user-shift-panel__calendar-body">
                  {calendarLayout.rows.map((row) => (
                    <div key={`row-${row.rowIndex}`} className="user-shift-panel__calendar-row">
                      <button
                        type="button"
                        className="user-shift-panel__calendar-week-number"
                        onClick={() => toggleDateGroup(calendarLayout.rowDates[row.rowIndex] || [])}
                      >
                        {row.weekNumber}
                      </button>

                      <div className="user-shift-panel__calendar-days-row">
                        {row.cells.map((dateKey, columnIndex) => {
                          if (!dateKey) {
                            return (
                              <div
                                key={`empty-${row.rowIndex}-${columnIndex}`}
                                className="user-shift-panel__calendar-cell user-shift-panel__calendar-cell--empty"
                              />
                            );
                          }

                          const day = Number(dateKey.split('-')[2]);
                          const shiftDay = dayMap.get(dateKey);
                          const isSelected = selectedDates.includes(dateKey);
                          const isToday = dateKey === todayDateKey;
                          const prevSelected = selectedDates.includes(
                            dayjs(dateKey).subtract(1, 'day').format('YYYY-MM-DD'),
                          );
                          const nextSelected = selectedDates.includes(
                            dayjs(dateKey).add(1, 'day').format('YYYY-MM-DD'),
                          );
                          const isRangeEnd = isSelected && !(prevSelected && nextSelected);

                          return (
                            <button
                              key={dateKey}
                              type="button"
                              className={[
                                'user-shift-panel__calendar-cell',
                                isToday && !isSelected ? 'user-shift-panel__calendar-cell--today' : '',
                                isSelected ? 'user-shift-panel__calendar-cell--selected' : '',
                                isRangeEnd ? 'user-shift-panel__calendar-cell--range-end' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={() => toggleDateGroup([dateKey])}
                            >
                              <span className="user-shift-panel__calendar-day">{day}</span>
                              {shiftDay ? (
                                <span className="user-shift-panel__calendar-hours">
                                  {formatCalendarHours(shiftDay.hours)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <SummaryStats
                totalHours={formatTotalHours(calendarSummary.totalHours)}
                totalDays={calendarSummary.totalDays}
                selectedWorkers={effectiveUsers.length}
                exportSlot={exportSlot}
                t={t}
              />
              </div>
            ) : (
              <div className="user-shift-panel__content user-shift-panel__content--custom">
                <div className="user-shift-panel__fields">
                  <label className="user-shift-panel__field">
                    <span className="user-shift-panel__field-label">{t('From')}</span>
                    <DatePicker
                      className="user-shift-panel__date-picker"
                      value={customFromDate}
                      onChange={(value) => setCustomFromDate(value)}
                      format="DD.MM.YYYY"
                      allowClear={false}
                      disabledDate={(current) => (
                        customToDate ? current.isAfter(customToDate, 'day') : false
                      )}
                    />
                  </label>

                  <label className="user-shift-panel__field">
                    <span className="user-shift-panel__field-label">{t('To')}</span>
                    <DatePicker
                      className="user-shift-panel__date-picker"
                      value={customToDate}
                      onChange={(value) => setCustomToDate(value)}
                      format="DD.MM.YYYY"
                      allowClear={false}
                      disabledDate={(current) => (
                        customFromDate ? current.isBefore(customFromDate, 'day') : false
                      )}
                    />
                  </label>
                </div>

                <SummaryStats
                  totalHours={formatTotalHours(customSummary.totalHours)}
                  totalDays={customSummary.totalDays}
                  selectedWorkers={effectiveUsers.length}
                  exportSlot={exportSlot}
                  t={t}
                />
              </div>
            )}
          </Spin>
        </div>
      </div>
    </aside>
  );
}
