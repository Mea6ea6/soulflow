import { motion, AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

interface ModalShellProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string; // напр. 'max-w-md', 'max-w-lg', 'max-w-2xl'
}

export default function ModalShell({ onClose, children, maxWidth = 'max-w-md' }: ModalShellProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4
                   md:items-center items-end md:px-4 px-0"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${maxWidth} max-h-[85vh] md:max-h-[85vh] max-h-[92vh]
                      overflow-y-auto bg-surface md:rounded-lg rounded-t-xl rounded-b-none md:rounded-b-lg
                      border border-border shadow-card-hover`}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}