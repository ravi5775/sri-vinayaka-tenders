import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CalendarIcon, Users, IndianRupee, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Loan, LoanType } from '../types';
import {
  calculateBalance,
  getInterestPerPeriod,
  getPendingInterest,
  getRemainingPrincipal,
} from '../utils/planCalculations';
import { sanitize } from '../utils/sanitizer';

type FilterType = 'All' | LoanType;

/**
 * Returns true if the selected date is a due/payment date for the given loan.
 *
 * Finance      : same day-of-month as start date, every month (after start month)
 * Tender       : single due date = startDate + durationInDays
 * InterestRate : every period boundary (daily / weekly / monthly) from start
 */
const isDueOn = (loan: Loan, date: Date): boolean => {
  if (calculateBalance(loan) <= 0) return false;

  const start = new Date(loan.startDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target < start) return false;

  if (loan.loanType === 'Finance') {
    return (
      target.getDate() === start.getDate() &&
      (target.getFullYear() > start.getFullYear() ||
        target.getMonth() > start.getMonth())
    );
  }

  if (loan.loanType === 'Tender') {
    if (!loan.durationInDays) return false;
    const due = new Date(start);
    due.setDate(start.getDate() + loan.durationInDays);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === target.getTime();
  }

  if (loan.loanType === 'InterestRate') {
    const unit = loan.durationUnit || 'Months';
    let cursor = new Date(start);
    while (cursor < target) {
      if (unit === 'Days') cursor.setDate(cursor.getDate() + 1);
      else if (unit === 'Weeks') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
      cursor.setHours(0, 0, 0, 0);
      if (cursor.getTime() === target.getTime()) return true;
    }
    return false;
  }

  return false;
};

const BADGE_CLS: Record<LoanType, string> = {
  Finance: 'bg-primary/10 text-primary',
  Tender: 'bg-amber-100 text-amber-700',
  InterestRate: 'bg-purple-100 text-purple-700',
};

const TYPE_LABEL: Record<LoanType, string> = {
  Finance: 'Finance',
  Tender: 'Tender',
  InterestRate: 'Interest Rate',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Tiny inline calendar (no external deps) */
const MiniCalendar: React.FC<{ value: Date; onChange: (d: Date) => void; onClose: () => void }> = ({ value, onChange, onClose }) => {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d: number) =>
    value.getFullYear() === year && value.getMonth() === month && value.getDate() === d;

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 w-64 z-50">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-muted">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-foreground">{MONTHS[month]} {year}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-muted">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center text-xs gap-y-0.5">
        {cells.map((d, i) => (
          <button
            key={i}
            disabled={d === null}
            onClick={() => { if (d) { onChange(new Date(year, month, d)); onClose(); } }}
            className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center transition-colors
              ${d === null ? '' : 'hover:bg-muted'}
              ${d && isSelected(d) ? 'bg-primary text-primary-foreground font-bold' : ''}
              ${d && isToday(d) && !isSelected(d) ? 'border border-primary text-primary font-semibold' : ''}
            `}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
};

const DueTodayPanel: React.FC = () => {
  const { loans } = useLoans();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<FilterType>('All');
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dueLoans = useMemo(() => {
    return loans.filter(loan => {
      if (filter !== 'All' && loan.loanType !== filter) return false;
      return isDueOn(loan, selectedDate);
    });
  }, [loans, selectedDate, filter]);

  const filterButtons: FilterType[] = ['All', 'Finance', 'Tender', 'InterestRate'];

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const getLoanDueInfo = (loan: Loan) => {
    if (loan.loanType === 'InterestRate') {
      const periodInterest = getInterestPerPeriod(loan);
      const pending = getPendingInterest(loan);
      const principal = getRemainingPrincipal(loan);
      const unit = loan.durationUnit;
      const periodLabel = unit === 'Days' ? 'Daily' : unit === 'Weeks' ? 'Weekly' : 'Monthly';
      return {
        dueAmount: periodInterest,
        label: `${periodLabel} Interest Due`,
        extra: pending > 0
          ? `+₹${pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })} pending interest`
          : null,
        sub: `Principal: ₹${principal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      };
    }
    const bal = calculateBalance(loan);
    return {
      dueAmount: bal,
      label: loan.loanType === 'Tender' ? 'Full Repayment Due' : 'Monthly Payment Due',
      extra: null,
      sub: null,
    };
  };

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-foreground tracking-tight">Due Payments</h2>
        </div>

        {/* Date picker button */}
        <div className="relative" ref={calRef}>
          <button
            onClick={() => setCalOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-2 border border-input rounded-xl bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            <CalendarIcon size={15} className="text-primary" />
            {formatDate(selectedDate)}
          </button>
          {calOpen && (
            <div className="absolute right-0 mt-1 z-50">
              <MiniCalendar
                value={selectedDate}
                onChange={setSelectedDate}
                onClose={() => setCalOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterButtons.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all duration-200 ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f === 'InterestRate' ? 'Interest Rate' : f}
          </button>
        ))}
      </div>

      {/* Results */}
      {dueLoans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <CheckCircle2 size={36} className="text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No payments due on {formatDate(selectedDate)}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {dueLoans.length} customer{dueLoans.length !== 1 ? 's' : ''} have a payment due on{' '}
            <span className="font-semibold text-foreground">{formatDate(selectedDate)}</span>
          </p>
          {dueLoans.map(loan => {
            const info = getLoanDueInfo(loan);
            return (
              <div
                key={loan.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {sanitize(loan.customerName)}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${BADGE_CLS[loan.loanType]}`}>
                      {TYPE_LABEL[loan.loanType]}
                    </span>
                    {info.extra && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive">
                        <AlertCircle size={10} /> {info.extra}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{sanitize(loan.phone)}</p>
                  {info.sub && <p className="text-xs text-muted-foreground">{info.sub}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{info.label}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 text-sm font-bold text-primary">
                  <IndianRupee size={14} />
                  {info.dueAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DueTodayPanel;
