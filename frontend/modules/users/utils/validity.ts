import { formatDateDDMMYYYY } from '@/lib/date';

export interface AerostakeValidityInfo {
  isLandingsOver: boolean;
  isValidityOver: boolean;
  tenureCalc: {
    daysRemaining: number;
    daysPassed: number;
    isTenureOver: boolean;
    formattedStart: string;
    formattedEnd: string;
    hasStartDate: boolean;
  };
}

export function calculateAerostakeValidity(
  totalLandings: number,
  agreementStartDateStr?: string
): AerostakeValidityInfo {
  const isLandingsOver = totalLandings >= 1000;

  if (!agreementStartDateStr) {
    const tenureCalc = {
      daysRemaining: 1095,
      daysPassed: 0,
      isTenureOver: false,
      formattedStart: '—',
      formattedEnd: '—',
      hasStartDate: false,
    };
    return {
      isLandingsOver,
      isValidityOver: isLandingsOver,
      tenureCalc,
    };
  }

  const start = new Date(agreementStartDateStr);
  const end = new Date(start);
  end.setFullYear(start.getFullYear() + 3);
  const now = new Date();
  const daysPassed = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, 1095 - daysPassed);
  const isTenureOver = daysRemaining <= 0;

  const tenureCalc = {
    daysRemaining,
    daysPassed,
    isTenureOver,
    formattedStart: formatDateDDMMYYYY(start),
    formattedEnd: formatDateDDMMYYYY(end),
    hasStartDate: true,
  };

  const isValidityOver = isLandingsOver || (tenureCalc.hasStartDate && tenureCalc.isTenureOver);

  return {
    isLandingsOver,
    isValidityOver,
    tenureCalc,
  };
}
