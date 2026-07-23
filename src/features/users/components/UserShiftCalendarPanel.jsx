import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, DatePicker, Spin, message } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import exportIcon from '@/src/assets/icons/u_export.svg';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { formatDuration } from '@/src/utils/formatDuration';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PERIOD_TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'custom', label: 'Custom period' },
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

const getShiftDateKey = (shift) => {
  const directDate = shift?.shiftDate || shift?.date;
  if (typeof directDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(directDate)) {
    return directDate;
  }

  const value = directDate || shift?.startedAt || shift?.createdAt;
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatCalendarHours = (durationMs = 0) => {
  const hours = durationMs / 3600000;
  if (hours >= 1) {
    return `${Math.round(hours)}h`;
  }

  return `${Math.max(1, Math.round(durationMs / 60000))}m`;
};

const formatTotalHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

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

const escapeCsvCell = (value) => {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const downloadCsv = (rows, fileName) => {
  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

function SummaryStats({ totalHours, totalDays, selectedWorkers, onExport, exportDisabled }) {
  return (
    <div className="user-shift-panel__summary">
      <div className="user-shift-panel__summary-stats">
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{totalHours}</span>
          <span className="user-shift-panel__summary-label">Total</span>
        </div>
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{`${totalDays} days`}</span>
          <span className="user-shift-panel__summary-label">Total</span>
        </div>
        <div className="user-shift-panel__summary-stat">
          <span className="user-shift-panel__summary-value">{`${selectedWorkers} workers`}</span>
          <span className="user-shift-panel__summary-label">Selected</span>
        </div>
      </div>

      <Button
        type="primary"
        className="user-shift-panel__export-button"
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
        onClick={onExport}
        disabled={exportDisabled}
      >
        Export
      </Button>
    </div>
  );
}

export default function UserShiftCalendarPanel({
  selectedUsers = [],
  shifts = [],
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [selectedDates, setSelectedDates] = useState([]);
  const [customFromDate, setCustomFromDate] = useState(() => dayjs().startOf('month'));
  const [customToDate, setCustomToDate] = useState(() => dayjs().endOf('month'));
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const selectedWorkerIds = useMemo(
    () => new Set(selectedUsers.map((user) => normalizeEntityId(user?._id || user)).filter(Boolean)),
    [selectedUsers],
  );

  const filteredShifts = useMemo(
    () => shifts.filter((shift) => selectedWorkerIds.has(normalizeEntityId(shift?.workerId))),
    [selectedWorkerIds, shifts],
  );

  const dayMap = useMemo(() => {
    const map = new Map();

    filteredShifts.forEach((shift) => {
      const dateKey = getShiftDateKey(shift);
      if (!dateKey) {
        return;
      }

      const current = map.get(dateKey) || {
        totalDurationMs: 0,
        shifts: [],
      };

      current.totalDurationMs += Number(shift.durationMs) || 0;
      current.shifts.push(shift);
      map.set(dateKey, current);
    });

    return map;
  }, [filteredShifts]);

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
    const totalDurationMs = activeDates.reduce(
      (sum, dateKey) => sum + (dayMap.get(dateKey)?.totalDurationMs || 0),
      0,
    );

    return {
      totalDurationMs,
      totalDays: activeDates.length,
      activeDates,
    };
  }, [dayMap, monthShiftDates, selectedDates]);

  const customSummary = useMemo(() => {
    const fromDate = customFromDate;
    const toDate = customToDate;

    if (!fromDate || !toDate) {
      return {
        totalDurationMs: 0,
        totalDays: 0,
        shifts: [],
        from: null,
        to: null,
      };
    }

    const from = fromDate.format('YYYY-MM-DD');
    const to = toDate.format('YYYY-MM-DD');
    const rangedShifts = filteredShifts.filter((shift) => {
      const dateKey = getShiftDateKey(shift);
      return dateKey && dateKey >= from && dateKey <= to;
    });

    const uniqueDays = new Set(rangedShifts.map(getShiftDateKey).filter(Boolean));
    const totalDurationMs = rangedShifts.reduce(
      (sum, shift) => sum + (Number(shift.durationMs) || 0),
      0,
    );

    return {
      totalDurationMs,
      totalDays: uniqueDays.size,
      shifts: rangedShifts,
      from,
      to,
    };
  }, [customFromDate, customToDate, filteredShifts]);

  const exportRows = useCallback((rows, fileName) => {
    const csvRows = [
      ['Worker', 'Project', 'Date', 'Start', 'End', 'Duration', 'Location'],
      ...rows
        .slice()
        .sort((left, right) => {
          const leftDate = new Date(left.startedAt || left.shiftDate || 0).getTime();
          const rightDate = new Date(right.startedAt || right.shiftDate || 0).getTime();
          return leftDate - rightDate;
        })
        .map((shift) => [
          shift.workerName || selectedUsers.find((user) =>
            normalizeEntityId(user) === normalizeEntityId(shift.workerId)
          )?.name || normalizeEntityId(shift.workerId) || '-',
          shift.projectName || shift.projectId || '-',
          getShiftDateKey(shift) || '-',
          formatAdminDateTime(shift.startedAt),
          formatAdminDateTime(shift.endedAt),
          formatDuration(Number(shift.durationMs) || 0),
          shift.location || '-',
        ]),
    ];

    downloadCsv(csvRows, fileName);
  }, [selectedUsers]);

  const handleExport = useCallback(() => {
    if (!selectedUsers.length) {
      message.info('Select users to export shifts.');
      return;
    }

    if (activeTab === 'calendar') {
      const exportDates = calendarSummary.activeDates;

      if (!exportDates.length) {
        message.info('No shifts for the selected month.');
        return;
      }

      const exportDateSet = new Set(exportDates);
      const rows = filteredShifts.filter((shift) => exportDateSet.has(getShiftDateKey(shift)));
      if (!rows.length) {
        message.info('No shifts to export for the current selection.');
        return;
      }

      exportRows(rows, `user-shifts-${selectedMonth}.csv`);
      return;
    }

    if (!customSummary.shifts.length || !customSummary.from || !customSummary.to) {
      message.info('No shifts to export for the selected custom period.');
      return;
    }

    exportRows(
      customSummary.shifts,
      `user-shifts-${customSummary.from}-${customSummary.to}.csv`,
    );
  }, [
    activeTab,
    calendarSummary.activeDates,
    customSummary.from,
    customSummary.shifts,
    customSummary.to,
    exportRows,
    filteredShifts,
    selectedMonth,
    selectedUsers.length,
  ]);

  return (
    <aside className="user-shift-panel">
      <div className="user-shift-panel__card">
        <div className="user-shift-panel__card-header">
          <div className="user-shift-panel__tabs" role="tablist" aria-label="Shift period tabs">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`user-shift-panel__tab${activeTab === tab.key ? ' user-shift-panel__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="user-shift-panel__card-body">
          <Spin spinning={loading}>
            {activeTab === 'calendar' ? (
              <div className="user-shift-panel__content">
              <div className="user-shift-panel__month-bar">
                <button
                  type="button"
                  className="user-shift-panel__month-button"
                  onClick={() => setSelectedMonth((current) => getAdjacentMonthKey(current, -1))}
                  aria-label="Previous month"
                >
                  <LeftOutlined />
                </button>

                <span className="user-shift-panel__month-label">{formatMonthLabel(selectedMonth)}</span>

                <button
                  type="button"
                  className="user-shift-panel__month-button"
                  onClick={() => setSelectedMonth((current) => getAdjacentMonthKey(current, 1))}
                  aria-label="Next month"
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

                          return (
                            <button
                              key={dateKey}
                              type="button"
                              className={[
                                'user-shift-panel__calendar-cell',
                                isToday && !isSelected ? 'user-shift-panel__calendar-cell--today' : '',
                                isSelected ? 'user-shift-panel__calendar-cell--selected' : '',
                              ].filter(Boolean).join(' ')}
                              onClick={() => toggleDateGroup([dateKey])}
                            >
                              <span className="user-shift-panel__calendar-day">{day}</span>
                              {shiftDay ? (
                                <span className="user-shift-panel__calendar-hours">
                                  {formatCalendarHours(shiftDay.totalDurationMs)}
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
                totalHours={formatTotalHours(calendarSummary.totalDurationMs)}
                totalDays={calendarSummary.totalDays}
                selectedWorkers={selectedUsers.length}
                onExport={handleExport}
                exportDisabled={!selectedUsers.length}
              />
              </div>
            ) : (
              <div className="user-shift-panel__content user-shift-panel__content--custom">
                <div className="user-shift-panel__fields">
                  <label className="user-shift-panel__field">
                    <span className="user-shift-panel__field-label">From</span>
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
                    <span className="user-shift-panel__field-label">To</span>
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
                  totalHours={formatTotalHours(customSummary.totalDurationMs)}
                  totalDays={customSummary.totalDays}
                  selectedWorkers={selectedUsers.length}
                  onExport={handleExport}
                  exportDisabled={!selectedUsers.length}
                />
              </div>
            )}
          </Spin>
        </div>
      </div>
    </aside>
  );
}
