import React, { useState } from 'react';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { Investor, PaymentType } from '../types';
import { X, DollarSign, Calendar, MessageSquare, Check, Loader2 } from 'lucide-react';
import { sanitize } from '../utils/sanitizer';

interface InvestorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investor: Investor;
}

const InvestorPaymentModal: React.FC<InvestorPaymentModalProps> = ({ isOpen, onClose, investor }) => {
  const { addInvestorPayment } = useInvestors();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payment_type, setPaymentType] = useState<PaymentType>('Profit');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addInvestorPayment(investor.id, { amount: paymentAmount, payment_date: date, payment_type, remarks });
      showToast(t('Payment logged successfully!'), 'success');
      onClose();
    } catch (err) {} finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in-fast">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">{t('Record Investor Payment')} for {sanitize(investor.name)}</h2>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 rounded-full hover:bg-muted"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Payment type toggle buttons */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2"><Check size={14}/>{t('Payment Type')}</label>
            <div className="flex gap-2">
              {(['Interest', 'Principal', 'Profit'] as PaymentType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentType(type)}
                  className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    payment_type === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-input hover:bg-secondary/80'
                  }`}
                  disabled={isSubmitting}
                >
                  {t(type)}
                </button>
              ))}
            </div>
          </div>
          <ModalInput icon={DollarSign} label={t('Payment Amount (₹)')} type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01" disabled={isSubmitting} />
          <ModalInput icon={Calendar} label={t('Payment Date')} type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={isSubmitting} />
          <ModalInput icon={MessageSquare} label={t('Remarks (optional)')} value={remarks} onChange={e => setRemarks(e.target.value)} disabled={isSubmitting} />
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>{t('Cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
              {t('Log Payment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalInput = ({ icon: Icon, label, ...props }: { icon: React.ComponentType<any>; label: string } & React.ComponentProps<'input'>) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Icon size={14}/>{label}</label>
    <input {...props} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary disabled:opacity-50 bg-background" />
  </div>
);

const ModalSelect = ({ icon: Icon, label, children, ...props }: { icon: React.ComponentType<any>; label: string, children: React.ReactNode } & React.ComponentProps<'select'>) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2"><Icon size={14}/>{label}</label>
    <select {...props} className="w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary bg-background disabled:opacity-50">
      {children}
    </select>
  </div>
);

export default InvestorPaymentModal;
