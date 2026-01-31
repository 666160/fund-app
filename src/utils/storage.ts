// 自选基金本地存储管理 - 包含持仓信息

import type { FundEstimate } from '@/api/fund';

const STORAGE_KEY = 'MY_FUNDS';

// 持仓信息
export interface FundHolding {
    code: string;          // 基金代码
    name: string;          // 基金名称
    shares: number;        // 持有份额
    costPrice: number;     // 成本价（买入均价）
    addTime: number;       // 添加时间
}

// 持仓计算结果
export interface HoldingCalculation {
    holdingAmount: number;      // 持有金额 = 份额 * 当前净值
    holdingProfit: number;      // 持有收益 = 持有金额 - 成本金额
    holdingProfitRate: number;  // 持有收益率
    todayProfit: number;        // 当日收益 = 份额 * 估值涨跌额
    costAmount: number;         // 成本金额 = 份额 * 成本价
}

/**
 * 计算单只基金的收益
 */
export function calculateHolding(holding: FundHolding, estimate: FundEstimate): HoldingCalculation {
    const gsz = parseFloat(estimate.gsz || '0');
    const dwjz = parseFloat(estimate.dwjz || '0');
    const gszzl = parseFloat(estimate.gszzl || '0');

    // 持有金额 = 份额 * 估算净值
    const holdingAmount = holding.shares * gsz;

    // 成本金额 = 份额 * 成本价
    const costAmount = holding.shares * holding.costPrice;

    // 持有收益 = 持有金额 - 成本金额
    const holdingProfit = holdingAmount - costAmount;

    // 持有收益率 = (持有收益 / 成本金额) * 100
    const holdingProfitRate = costAmount > 0 ? (holdingProfit / costAmount) * 100 : 0;

    // 当日收益 = 份额 * 昨日净值 * 估算涨跌幅 / 100
    const todayProfit = holding.shares * dwjz * gszzl / 100;

    return {
        holdingAmount,
        holdingProfit,
        holdingProfitRate,
        todayProfit,
        costAmount
    };
}

/**
 * 获取自选基金列表
 */
export function getMyFunds(): FundHolding[] {
    try {
        const data = uni.getStorageSync(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * 添加自选基金
 */
export function addMyFund(fund: { code: string; name: string; shares?: number; costPrice?: number }): boolean {
    const funds = getMyFunds();
    const exists = funds.some(f => f.code === fund.code);
    if (exists) return false;

    funds.unshift({
        code: fund.code,
        name: fund.name,
        shares: fund.shares || 0,
        costPrice: fund.costPrice || 0,
        addTime: Date.now()
    });

    uni.setStorageSync(STORAGE_KEY, JSON.stringify(funds));
    return true;
}

/**
 * 更新基金持仓信息
 */
export function updateFundHolding(code: string, shares: number, costPrice: number): void {
    const funds = getMyFunds();
    const index = funds.findIndex(f => f.code === code);
    if (index !== -1) {
        funds[index].shares = shares;
        funds[index].costPrice = costPrice;
        uni.setStorageSync(STORAGE_KEY, JSON.stringify(funds));
    }
}

/**
 * 删除自选基金
 */
export function removeMyFund(code: string): void {
    const funds = getMyFunds();
    const filtered = funds.filter(f => f.code !== code);
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * 检查是否已添加
 */
export function isFundAdded(code: string): boolean {
    const funds = getMyFunds();
    return funds.some(f => f.code === code);
}

/**
 * 获取单只基金持仓
 */
export function getFundHolding(code: string): FundHolding | undefined {
    const funds = getMyFunds();
    return funds.find(f => f.code === code);
}

/**
 * 计算账户总资产和总收益
 */
export function calculateTotalAssets(
    holdings: FundHolding[],
    estimates: Map<string, FundEstimate>
): {
    totalAssets: number;
    totalCost: number;
    totalProfit: number;
    totalTodayProfit: number;
    totalProfitRate: number;
} {
    let totalAssets = 0;
    let totalCost = 0;
    let totalTodayProfit = 0;

    holdings.forEach(holding => {
        const estimate = estimates.get(holding.code);
        if (estimate && holding.shares > 0) {
            const calc = calculateHolding(holding, estimate);
            totalAssets += calc.holdingAmount;
            totalCost += calc.costAmount;
            totalTodayProfit += calc.todayProfit;
        }
    });

    const totalProfit = totalAssets - totalCost;
    const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
        totalAssets,
        totalCost,
        totalProfit,
        totalTodayProfit,
        totalProfitRate
    };
}
