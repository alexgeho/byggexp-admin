import './GridWorkspaceHeader.scss';

// Shared header stack that sits above the Hours (Shifts) and Schedule grids so
// both pages read the same way: a tabs row, a mode-toggle row (Hours by /
// Plan for) and a period row (period nav + zoom + primary action). Each page
// fills the slots with the same ui-kit primitives; this only owns the layout
// and spacing, so the two pages line up 1:1 and change in one place.
// reserveRows keeps the toggle/period rows' height even when their slots are
// empty, so the table below never jumps when a tab hides them.
export default function GridWorkspaceHeader({ tabs, toggleRow, periodRow, reserveRows = false, className = '' }) {
  const classes = ['grid-workspace-header', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {tabs ? <div className="grid-workspace-header__tabs">{tabs}</div> : null}
      {toggleRow || reserveRows ? (
        <div className="grid-workspace-header__row grid-workspace-header__row--toggle">{toggleRow}</div>
      ) : null}
      {periodRow || reserveRows ? (
        <div className="grid-workspace-header__row grid-workspace-header__row--period">{periodRow}</div>
      ) : null}
    </div>
  );
}
