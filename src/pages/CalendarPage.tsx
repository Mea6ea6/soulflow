import { useState, useMemo, useEffect, useRef } from 'react';
import { CaretLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useCalendarEvents, useClients } from '../hooks/useDB';
import type { CalendarEvent } from '../types';
import { toYMD } from '../utils/date';
import CalendarEventModal from '../components/CalendarEventModal';
import WeekCalendarView from '../components/WeekCalendarView';

const MAX_VISIBLE_EVENTS = 2;
type ViewMode = 'month' | 'week';

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { masterKey } = useAuth();
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const weekdays = [
    t('calendar.weekdays.mon'), t('calendar.weekdays.tue'), t('calendar.weekdays.wed'),
    t('calendar.weekdays.thu'), t('calendar.weekdays.fri'), t('calendar.weekdays.sat'), t('calendar.weekdays.sun'),
  ];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((ev) => {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    });
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [events]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  useEffect(() => {
    if (!expandedDate) return;
    const handler = () => setExpandedDate(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [expandedDate]);

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToToday = () => setViewDate(new Date());

  const handleDayClick = (date: Date) => {
    setModalDate(toYMD(date));
    setEditingEvent(null);
  };

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDate(null);
    setModalDate(ev.date);
    setEditingEvent(ev);
  };

  const eventLabel = (ev: CalendarEvent) =>
    ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('common.dash');

  const monthLabel = viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div ref={containerRef} className="flex flex-col justify-center min-h-[calc(100vh-8rem)]">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex items-center justify-end mb-4">
          <div className="inline-flex p-1 rounded-full bg-surface-hover">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('calendar.viewMonth')}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('calendar.viewWeek')}
            </button>
          </div>
        </div>

        {viewMode === 'week' ? (
          <WeekCalendarView />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-display font-semibold text-text-primary capitalize">{monthLabel}</h1>
              <div className="flex items-center gap-2">
                <button onClick={goToToday} className="px-3 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
                  {t('calendar.today')}
                </button>
                <button onClick={goToPrevMonth} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover transition-colors">
                  <CaretLeftIcon size={18} />
                </button>
                <button onClick={goToNextMonth} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover transition-colors">
                  <CaretRightIcon size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px] grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border shadow-card">
                {weekdays.map((day) => (
                  <div key={day} className="bg-surface-hover text-center text-xs font-semibold tracking-wide uppercase text-text-tertiary py-3">
                    {day}
                  </div>
                ))}

                {days.map((date) => {
                  const ymd = toYMD(date);
                  const isCurrentMonth = date.getMonth() === month;
                  const isToday = ymd === todayYMD;
                  const dayEvents = eventsByDate.get(ymd) ?? [];
                  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                  const hiddenCount = dayEvents.length - visibleEvents.length;
                  const isExpanded = expandedDate === ymd;

                  return (
                    <button
                      key={ymd}
                      onClick={() => handleDayClick(date)}
                      className={`relative min-h-24 sm:min-h-28 p-2.5 flex flex-col items-start gap-1.5 text-left transition-colors ${
                        isCurrentMonth ? 'bg-surface hover:bg-surface-hover' : 'bg-bg text-text-tertiary hover:bg-surface-hover'
                      }`}
                    >
                      <span
                        className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-primary text-white font-semibold' : isCurrentMonth ? 'text-text-primary' : ''
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <div className="flex flex-col gap-1 w-full">
                        {visibleEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => handleEventClick(ev, e)}
                            className={`text-xs px-1.5 py-1 rounded-md truncate w-full ${
                              ev.isPersonal ? 'bg-secondary-tint text-secondary' : 'bg-primary-tint text-primary'
                            }`}
                          >
                            {ev.time} {eventLabel(ev)}
                          </div>
                        ))}

                        {hiddenCount > 0 && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setExpandedDate(isExpanded ? null : ymd); }}
                            className="text-xs font-medium text-text-tertiary hover:text-text-secondary px-1.5 cursor-pointer"
                          >
                            {t('calendar.moreEvents', { count: hiddenCount })}
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && hiddenCount > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute z-30 top-2 left-2 right-2 bg-surface border border-border rounded-lg shadow-card-hover p-1.5 flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between px-1 pb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                                {date.getDate()} {monthLabel}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedDate(null); }}
                                className="p-0.5 rounded text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
                              >
                                <XIcon size={12} />
                              </button>
                            </div>
                            {dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => handleEventClick(ev, e)}
                                className={`text-xs px-2 py-1.5 rounded-md truncate w-full ${
                                  ev.isPersonal ? 'bg-secondary-tint text-secondary' : 'bg-primary-tint text-primary'
                                }`}
                              >
                                {ev.time} {eventLabel(ev)}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {modalDate && (
        <CalendarEventModal
          date={modalDate}
          event={editingEvent}
          onClose={() => { setModalDate(null); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}