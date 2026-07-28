import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';
import { useCalendarEvents, useClients } from '../hooks/useDB';
import type { CalendarEvent } from '../types';
import { toYMD } from '../utils/date';
import CalendarEventModal from '../components/CalendarEventModal';

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  // 0 = вс, 1 = пн ... переводим в понедельник-first (0 = пн)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const { masterKey } = useAuth();
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayYMD = toYMD(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((ev) => {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [events]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToToday = () => setViewDate(new Date());

  const handleDayClick = (date: Date) => {
    setModalDate(toYMD(date));
    setEditingEvent(null);
  };

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalDate(ev.date);
    setEditingEvent(ev);
  };

  const monthLabel = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 capitalize">
          {monthLabel}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('calendar.today')}
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
          <div
            key={day}
            className="bg-gray-50 dark:bg-gray-900 text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {t(`calendar.weekdays.${day}`)}
          </div>
        ))}

        {days.map((date) => {
          const ymd = toYMD(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = ymd === todayYMD;
          const dayEvents = eventsByDate.get(ymd) ?? [];

          return (
            <button
              key={ymd}
              onClick={() => handleDayClick(date)}
              className={`min-h-24 p-2 flex flex-col items-start gap-1 text-left transition-colors ${
                isCurrentMonth
                  ? 'bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900'
                  : 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              <span
                className={`text-sm w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-indigo-600 text-white font-semibold'
                    : isCurrentMonth
                    ? 'text-gray-700 dark:text-gray-200'
                    : ''
                }`}
              >
                {date.getDate()}
              </span>

              <div className="flex flex-col gap-0.5 w-full">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => handleEventClick(ev, e)}
                    className={`text-[11px] px-1.5 py-0.5 rounded truncate w-full ${
                      ev.isPersonal
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                    }`}
                    title={ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? ''}
                  >
                    {ev.time} {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('common.dash')}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 px-1.5">
                    {t('calendar.moreEvents', { count: dayEvents.length - 3 })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {modalDate && (
        <CalendarEventModal
          date={modalDate}
          event={editingEvent}
          onClose={() => {
            setModalDate(null);
            setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
}