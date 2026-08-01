import { useState, useMemo, useRef, useEffect } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuthHook';
import { useCalendarEvents, useClients } from '../hooks/useDB';
import type { CalendarEvent } from '../types';
import { toYMD } from '../utils/date';
import CalendarEventModal from './CalendarEventModal';

const HOUR_START = 0;
const HOUR_END = 24;
const ROW_HEIGHT = 56;
const SESSION_MINUTES = 50;
const VISIBLE_HOURS = 13;
const SCROLL_TO_HOUR = 8;

const EVENT_PALETTE = [
  { bg: '#E1F0EC', text: '#1D6A57', border: '#A6D9CB' },
  { bg: '#FBE7EE', text: '#A23D5E', border: '#F0BFD1' },
  { bg: '#EAF3DE', text: '#4C7A2C', border: '#C7DDA6' },
  { bg: '#E6F0FA', text: '#2E5F8A', border: '#B8D6EE' },
  { bg: '#FBEFE1', text: '#A66A1E', border: '#F0D3AB' },
  { bg: '#F1E9F5', text: '#6E4A82', border: '#D9C3E3' },
];

function getEventColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return EVENT_PALETTE[Math.abs(hash) % EVENT_PALETTE.length];
}

function getWeekStart(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function WeekCalendarView() {
  const { t, i18n } = useTranslation();
  const { masterKey } = useAuth();
  const events = useCalendarEvents(masterKey);
  const clients = useClients(masterKey);

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [todayYMD] = useState(() => toYMD(new Date()));
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * ROW_HEIGHT;
    }
  }, []);

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    []
  );

  const weekdayLabels = [
    t('calendar.weekdays.mon'), t('calendar.weekdays.tue'), t('calendar.weekdays.wed'),
    t('calendar.weekdays.thu'), t('calendar.weekdays.fri'), t('calendar.weekdays.sat'), t('calendar.weekdays.sun'),
  ];

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

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

  const eventLabel = (ev: CalendarEvent) =>
    ev.isPersonal ? ev.title : clientNameById.get(ev.clientId ?? '') ?? t('common.dash');

  const goToPrevWeek = () => setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  const goToNextWeek = () => setAnchorDate((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  const goToToday = () => {
    setAnchorDate(new Date());
    if (scrollRef.current) scrollRef.current.scrollTop = SCROLL_TO_HOUR * ROW_HEIGHT;
  };

  const handleSlotClick = (date: Date) => {
    setModalDate(toYMD(date));
    setEditingEvent(null);
  };

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalDate(ev.date);
    setEditingEvent(ev);
  };

  const weekLabel = `${weekStart.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })} — ${weekDays[6].toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}`;

  const columnHeight = hours.length * ROW_HEIGHT;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-semibold text-text-primary capitalize">{weekLabel}</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="px-3 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors">
            {t('calendar.today')}
          </button>
          <button onClick={goToPrevWeek} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover transition-colors">
            <CaretLeftIcon size={18} />
          </button>
          <button onClick={goToNextWeek} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover transition-colors">
            <CaretRightIcon size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px] border border-border rounded-xl overflow-hidden bg-surface shadow-card">
          <div className="flex border-b border-border">
            <div className="w-14 shrink-0" />
            {weekDays.map((date, i) => {
              const ymd = toYMD(date);
              const isToday = ymd === todayYMD;
              return (
                <div key={ymd} className="flex-1 text-center py-3 border-l border-border">
                  <p className="text-xs font-semibold tracking-wide uppercase text-text-tertiary">{weekdayLabels[i]}</p>
                  <p className={`mt-1 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                    isToday ? 'bg-primary text-white font-semibold' : 'text-text-primary'
                  }`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div ref={scrollRef} className="flex overflow-y-auto overflow-x-visible" style={{ maxHeight: VISIBLE_HOURS * ROW_HEIGHT }}>
            <div className="w-14 shrink-0">
              {hours.map((h) => (
                <div key={h} style={{ height: ROW_HEIGHT }} className="text-right pr-2 -translate-y-2">
                  <span className="text-[11px] text-text-tertiary">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {weekDays.map((date) => {
              const ymd = toYMD(date);
              const dayEvents = eventsByDate.get(ymd) ?? [];

              return (
                <div
                  key={ymd}
                  className="flex-1 relative border-l border-border cursor-pointer"
                  style={{ height: columnHeight }}
                  onClick={() => handleSlotClick(date)}
                >
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      style={{ top: i * ROW_HEIGHT, borderTop: '1px solid var(--color-border)', opacity: 0.5 }}
                      className="absolute left-0 right-0"
                    />
                  ))}

                  {dayEvents.map((ev, idx) => {
                    const startMin = minutesFromMidnight(ev.time);
                    const top = ((startMin - HOUR_START * 60) / 60) * ROW_HEIGHT;
                    const height = (SESSION_MINUTES / 60) * ROW_HEIGHT;
                    if (top < 0 || top > columnHeight) return null;

                    const sameSlot = dayEvents.filter((e) => e.time === ev.time);
                    const slotIndex = sameSlot.indexOf(ev);
                    const width = 100 / sameSlot.length;
                    const colors = getEventColor(ev.isPersonal ? `p-${ev.id}` : ev.clientId ?? ev.id);
                    const isHovered = hoveredEventId === ev.id;

                    return (
                      <div
                        key={ev.id ?? idx}
                        onClick={(e) => handleEventClick(ev, e)}
                        onMouseEnter={() => setHoveredEventId(ev.id)}
                        onMouseLeave={() => setHoveredEventId((prev) => (prev === ev.id ? null : prev))}
                        style={{
                          top,
                          height: Math.max(height, 22),
                          left: isHovered ? 0 : `${slotIndex * width}%`,
                          width: isHovered ? '100%' : `calc(${width}% - 4px)`,
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                          zIndex: isHovered ? 30 : 10,
                          boxShadow: isHovered ? '0 4px 12px var(--color-shadow-hover)' : 'none',
                        }}
                        className="absolute mx-0.5 rounded-md border px-2 py-1 overflow-hidden text-left transition-all duration-150"
                      >
                        <p className="text-[11px] font-semibold truncate">{ev.time}</p>
                        <p className="text-[11px] truncate">{eventLabel(ev)}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
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