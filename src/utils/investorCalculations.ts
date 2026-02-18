import { Investor } from '../types';

interface InvestorMetrics {
  currentBalance: number;
  accumulatedProfit: number;
  totalPaid: number;
  missedMonths: number;
  monthlyProfit: number;
  status: 'On Track' | 'Delayed' | 'Closed';
}

export const calculateInvestorMetrics = (investor: Investor): InvestorMetrics => {
  if (investor.status === 'Closed') {
    const totalPaid = investor.payments.reduce((sum, p) => sum + p.amount, 0);
    const accumulatedProfit = Math.max(0, totalPaid - investor.investmentAmount);
    return { currentBalance: 0, accumulatedProfit, totalPaid, missedMonths: 0, monthlyProfit: 0, status: 'Closed' };
  }

  const startDate = new Date(investor.startDate);
  const today = new Date();
  const monthlyProfit = investor.investmentAmount * (investor.profitRate / 100);
  let monthsCompleted = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
  if (today.getDate() < startDate.getDate()) monthsCompleted--;
  monthsCompleted = Math.max(0, monthsCompleted);

  const accumulatedProfit = monthlyProfit * monthsCompleted;
  const totalPaid = investor.payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingProfit = accumulatedProfit - totalPaid;
  const missedMonths = monthlyProfit > 0 ? Math.floor(Math.max(0, pendingProfit) / monthlyProfit) : 0;
  let status: 'On Track' | 'Delayed' | 'Closed' = 'On Track';
  if (pendingProfit > 0.01) status = 'Delayed';
  const currentBalance = investor.investmentAmount + Math.max(0, pendingProfit);

  return { currentBalance, accumulatedProfit, totalPaid, missedMonths, monthlyProfit, status };
};

interface InvestorSummary {
  totalInvestors: number;
  totalInvestment: number;
  totalProfitEarned: number;
  totalPaidToInvestors: number;
  totalPendingProfit: number;
  overallProfitLoss: number;
}

export const calculateInvestorSummary = (investors: Investor[]): InvestorSummary => {
  const summary: InvestorSummary = {
    totalInvestors: investors.length,
    totalInvestment: 0, totalProfitEarned: 0, totalPaidToInvestors: 0, totalPendingProfit: 0, overallProfitLoss: 0,
  };

  investors.forEach(investor => {
    const metrics = calculateInvestorMetrics(investor);
    const pendingProfit = Math.max(0, metrics.accumulatedProfit - metrics.totalPaid);
    summary.totalInvestment += investor.investmentAmount;
    summary.totalPaidToInvestors += metrics.totalPaid;
    summary.totalProfitEarned += metrics.accumulatedProfit;
    // Exclude InterestRatePlan interest from total pending
    if (investor.investmentType !== 'InterestRatePlan') {
      summary.totalPendingProfit += pendingProfit;
    }
  });

  summary.overallProfitLoss = summary.totalPaidToInvestors - summary.totalInvestment;
  return summary;
};
