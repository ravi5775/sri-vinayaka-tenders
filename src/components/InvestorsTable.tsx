import React, { useState } from 'react';
import { Investor } from '../types';
import { useInvestors } from '../contexts/InvestorContext';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateInvestorMetrics } from '../utils/investorCalculations';
import { Edit, Trash2, IndianRupee, History, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import InvestorForm from './InvestorForm';
import InvestorPaymentModal from './InvestorPaymentModal';
import InvestorHistoryModal from './InvestorHistoryModal';
import { sanitize } from '../utils/sanitizer';

const calculateNextPayoutDate = (investor: Investor): Date => {
  const today = new Date();
  let nextPayout = new Date(investor.startDate);
  while (nextPayout <= today) {
    nextPayout.setMonth(nextPayout.getMonth() + 1);
  }
  return nextPayout;
};

const InvestorsTable: React.FC = () => {
  const { investors, deleteInvestor } = useInvestors();
  const { t } = useLanguage();

  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [payingInvestor, setPayingInvestor] = useState<Investor | null>(null);
  const [historyInvestor, setHistoryInvestor] = useState<Investor | null>(null);
  const [deletingInvestorId, setDeletingInvestorId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletingInvestorId) {
      await deleteInvestor(deletingInvestorId);
      setDeletingInvestorId(null);
    }
  };

  const getStatusChip = (status: 'On Track' | 'Delayed' | 'Closed') => {
    switch (status) {
      case 'On Track': return 'bg-green-100 text-green-800';
      case 'Delayed': return 'bg-yellow-100 text-yellow-800';
      case 'Closed': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-card divide-y divide-border">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Investor Name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Investment Type')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Invested Amount')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Interest')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Accumulated Profit')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('Total Paid')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">{t('Missed Months')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('Next Payout Date')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {investors.map((investor) => {
              const metrics = calculateInvestorMetrics(investor);
              const profitLoss = metrics.totalPaid - investor.investmentAmount;
              const profitLossColor = profitLoss >= 0 ? 'text-green-600' : 'text-destructive';
              const nextPayoutDate = investor.status !== 'Closed' ? calculateNextPayoutDate(investor).toLocaleDateString() : 'N/A';

              return (
                <tr key={investor.id} className="hover:bg-muted/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">{sanitize(investor.name)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{t(investor.investmentType)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">₹{investor.investmentAmount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right font-mono">
                    {investor.investmentType === 'InterestRatePlan' ? `₹${metrics.monthlyProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-semibold ${profitLossColor}`}>₹{metrics.accumulatedProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-right">₹{metrics.totalPaid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center">{metrics.missedMonths > 0 ? <span className='flex items-center justify-center gap-1 text-destructive'><AlertCircle size={14}/> {metrics.missedMonths}</span> : 0}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChip(metrics.status)}`}>{t(metrics.status)}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{nextPayoutDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setPayingInvestor(investor)} className="p-2 rounded-full text-blue-600 hover:bg-blue-100" title={t('Pay Now')} disabled={investor.status === 'Closed'}><IndianRupee size={18} /></button>
                      <button onClick={() => setHistoryInvestor(investor)} className="p-2 rounded-full text-purple-600 hover:bg-purple-100" title={t('View History')}><History size={18} /></button>
                      <button onClick={() => setEditingInvestor(investor)} className="p-2 rounded-full text-green-600 hover:bg-green-100" title={t('Edit')}><Edit size={18} /></button>
                      <button onClick={() => setDeletingInvestorId(investor.id)} className="p-2 rounded-full text-destructive hover:bg-destructive/10" title={t('Delete')}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {investors.length === 0 && <p className="text-center text-muted-foreground py-8">{t('No investors found.')}</p>}

      {editingInvestor && <InvestorForm isOpen={!!editingInvestor} onClose={() => setEditingInvestor(null)} investorToEdit={editingInvestor} />}
      {payingInvestor && <InvestorPaymentModal isOpen={!!payingInvestor} onClose={() => setPayingInvestor(null)} investor={payingInvestor} />}
      {historyInvestor && <InvestorHistoryModal isOpen={!!historyInvestor} onClose={() => setHistoryInvestor(null)} investor={historyInvestor} />}

      <ConfirmationModal isOpen={!!deletingInvestorId} onClose={() => setDeletingInvestorId(null)} onConfirm={handleDelete} title={t('Delete Investor')} variant="danger">
        {t('Are you sure you want to delete this investor?')} {t('This action cannot be undone.')}
      </ConfirmationModal>
    </>
  );
};

export default InvestorsTable;
