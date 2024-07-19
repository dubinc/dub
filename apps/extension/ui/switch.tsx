import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { Tooltip } from './tooltip';
import { cn } from '@dub/utils';

export function Switch({
  fn,
  trackDimensions = 'h-5 w-9', 
  thumbDimensions = 'h-3 w-3', 
  checked = true,
  thumbTranslate,
  loading = false,
  disabled = false,
  disabledTooltip,
}:  { fn?: Dispatch<SetStateAction<boolean>> | ((checked: boolean) => void);
trackDimensions?: string;
thumbDimensions?: string;
thumbTranslate?: string;
checked?: boolean;
loading?: boolean;
disabled?: boolean;
disabledTooltip?: string | ReactNode}) {
  const handleChange = () => {
    if (fn && !loading && !disabled) {
      fn(!checked);
    }
  };

  if (disabledTooltip) {
    return (
      <Tooltip content={disabledTooltip}>
        <div className={`relative inline-flex ${trackDimensions} flex-shrink-0 cursor-not-allowed rounded-full bg-gray-200`}>
          <div className={`${thumbDimensions} transform rounded-full bg-white shadow-lg`} />
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      onClick={handleChange}
      className={cn(
        loading ? 'bg-gray-200' : disabled ? 'cursor-not-allowed bg-gray-300' : checked ? 'bg-blue-500' : 'bg-gray-200',
        'relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer p-1',
        trackDimensions,
        'focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75',
        checked ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'flex items-center',
          thumbDimensions,
        )}
      >
        <div
          className={cn(
            'bg-white transform rounded-full shadow-lg transition duration-400 ease-in-out',
            thumbDimensions,
            checked && thumbTranslate,
          )}
          style={{ transform: checked ? 'translateX(100%)' : 'translateX(0)',
            transition: 'transform 0.4s' }}
        />
      </div>
    </div>
  );
}
