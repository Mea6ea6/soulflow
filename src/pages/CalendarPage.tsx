import { useState, useMemo } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useCalendarEvents, useClients } from '../hooks/useDB';
import type { CalendarEvent } from '../types';
import { toYMD } from '../utils/date';
import CalendarEventModal from '../components/CalendarEventModal';

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

  const [viewDate, setViewDate] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [todayYMD] = useState(() => toYMD(new Date()));

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

  const monthLabel = viewDate.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
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

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {weekdays.map((day) => (
          <div key={day} className="bg-surface-hover text-center text-xs font-medium text-text-tertiary py-2">
            {day}
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
                isCurrentMonth ? 'bg-surface hover:bg-surface-hover' : 'bg-bg text-text-tertiary hover:bg-surface-hover'
              }`}
            >
              <span
                className={`text-sm w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-primary text-white font-semibold' : isCurrentMonth ? 'text-text-primary' : ''
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
                      ev.isPersonal ? 'bg-secondary-tint text-secondary' : 'bg-primary-tint text-primary'
                    }`}
                  >
                    {ev.time} {ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('common.dash')}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[11px] text-text-tertiary px-1.5">
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
          onClose={() => { setModalDate(null); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}