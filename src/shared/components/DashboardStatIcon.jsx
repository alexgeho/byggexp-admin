const iconProps = {
  className: 'dashboard-stat-card__icon-image',
  fill: 'none',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': 'true',
};

const pathProps = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export default function DashboardStatIcon({ name }) {
  if (name === 'briefcase') {
    return (
      <svg {...iconProps}>
        <path d="M9 6V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V6" {...pathProps} />
        <path d="M4 8.5C4 7.39543 4.89543 6.5 6 6.5H18C19.1046 6.5 20 7.39543 20 8.5V17.5C20 18.6046 19.1046 19.5 18 19.5H6C4.89543 19.5 4 18.6046 4 17.5V8.5Z" {...pathProps} />
        <path d="M4 11.5H20" {...pathProps} />
        <path d="M10 11.5V12.5C10 13.0523 10.4477 13.5 11 13.5H13C13.5523 13.5 14 13.0523 14 12.5V11.5" {...pathProps} />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...iconProps}>
        <path d="M16.5 19.5V18C16.5 16.3431 15.1569 15 13.5 15H7.5C5.84315 15 4.5 16.3431 4.5 18V19.5" {...pathProps} />
        <path d="M10.5 12C12.1569 12 13.5 10.6569 13.5 9C13.5 7.34315 12.1569 6 10.5 6C8.84315 6 7.5 7.34315 7.5 9C7.5 10.6569 8.84315 12 10.5 12Z" {...pathProps} />
        <path d="M20 19.5V18C19.999 16.6168 19.0592 15.4112 17.7188 15.075" {...pathProps} />
        <path d="M15.2188 6.075C16.5631 6.40869 17.5064 7.61626 17.5064 9.0025C17.5064 10.3887 16.5631 11.5963 15.2188 11.93" {...pathProps} />
      </svg>
    );
  }

  if (name === 'check-circle') {
    return (
      <svg {...iconProps}>
        <path d="M21 11.08V12C20.9988 14.1564 20.3005 16.2547 19.0093 17.9818C17.7182 19.7088 15.9033 20.9725 13.8354 21.5839C11.7674 22.1953 9.55726 22.1219 7.53447 21.3746C5.51168 20.6273 3.78465 19.2461 2.61096 17.4371C1.43727 15.628 0.879791 13.4881 1.02168 11.3363C1.16356 9.18455 1.99721 7.13631 3.39828 5.49706C4.79935 3.85781 6.69279 2.71537 8.79619 2.24013C10.8996 1.7649 13.1003 1.98232 15.07 2.86" {...pathProps} />
        <path d="M21 4L12 13.01L9.30005 10.31" {...pathProps} />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" {...pathProps} />
      <path d="M12 6V12L16 14" {...pathProps} />
    </svg>
  );
}
