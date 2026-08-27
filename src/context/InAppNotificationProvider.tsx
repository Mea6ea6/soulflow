import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRingingIcon, XIcon } from '@phosphor-icons/react';
import { InAppNotificationContext, type InAppNotificationPayload } from './InAppNotificationContextDef';

const AUTO_DISMISS_MS = 15_000;

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<InAppNotificationPayload | null>(null);

  const showNotification = useCallback((payload: InAppNotificationPayload) => {
    setCurrent(payload);
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 right-4 z-[200] w-full max-w-sm"
            onClick={() => setCurrent(null)}
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface shadow-card-hover border border-border cursor-pointer">
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center">
                <BellRingingIcon size={18} weight="fill" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{current.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{current.body}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrent(null); }}
                className="shrink-0 p-1 rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <XIcon size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </InAppNotificationContext.Provider>
  );
}