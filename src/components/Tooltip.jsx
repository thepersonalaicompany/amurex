import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

// Global state to manage tooltip visibility across all instances
let globalClickActive = false;

export const Tooltip = ({
  children,
  content,
  position = 'top',
  trigger = 'hover',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-neutral-700';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-neutral-700';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-neutral-700';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-neutral-700';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-neutral-700';
    }
  };

  // Effect to hide hover tooltips when click tooltips are active
  useEffect(() => {
    if (trigger === 'hover' && globalClickActive) {
      setIsVisible(false);
    }
  }, [globalClickActive, trigger]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !globalClickActive) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      // Set global state to hide all hover tooltips
      globalClickActive = true;
      setIsVisible(true);

      // Auto-hide after 2 seconds for click-triggered tooltips
      setTimeout(() => {
        setIsVisible(false);
        globalClickActive = false;
      }, 2000);
    }
  };

  return (
    <div
      className='relative inline-block'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-50 ${getPositionClasses()}`}
          >
            <div className='relative rounded-md bg-[var(--color-neutral-700)] px-2 py-1 text-xs text-white shadow-lg'>
              {content}
              {/* Arrow */}
              <div
                className={`absolute h-0 w-0 border-4 ${getArrowClasses()}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
