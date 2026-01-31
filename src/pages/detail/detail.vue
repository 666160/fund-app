<template>
  <view class="detail-page">
    <!-- 头部 -->
    <view class="header" :class="isRise ? 'header--rise' : 'header--fall'">
      <view class="header__nav">
        <view class="header__back" @click="goBack">
          <text>←</text>
        </view>
        <view class="header__center">
          <text class="header__name">{{ fundData?.name || name }}</text>
          <text class="header__code">{{ fundData?.fundcode || code }}</text>
        </view>
        <view class="header__action" @click="goToSearch">
          <text>🔍</text>
        </view>
      </view>

      <view v-if="fundData" class="header__content">
        <view class="header__main">
          <text class="header__label">当日涨幅</text>
          <text class="header__percent">{{ displayPercent }}</text>
        </view>

        <view class="header__footer">
          <text class="header__time">{{ fundData.gztime || '--' }}</text>
          <view class="header__refresh" :class="{ 'header__refresh--loading': refreshing }" @click="onRefresh">
            <text>🔄</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 持仓信息 -->
    <view v-if="holdingData && holdingData.shares > 0" class="section holding-section">
      <view class="holding-grid">
        <view class="holding-item">
          <text class="holding-item__label">持有金额</text>
          <text class="holding-item__value">{{ formatMoney(calc.holdingAmount) }}</text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持有份额</text>
          <text class="holding-item__value">{{ holdingData.shares.toFixed(2) }}</text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持仓占比</text>
          <text class="holding-item__value">--</text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持有收益</text>
          <text class="holding-item__value" :class="calc.holdingProfit >= 0 ? 'rise' : 'fall'">
            {{ formatProfit(calc.holdingProfit) }}
          </text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持有收益率</text>
          <text class="holding-item__value" :class="calc.holdingProfitRate >= 0 ? 'rise' : 'fall'">
            {{ formatRate(calc.holdingProfitRate) }}
          </text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持仓成本</text>
          <text class="holding-item__value">{{ holdingData.costPrice.toFixed(4) }}</text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">当日收益</text>
          <text class="holding-item__value" :class="calc.todayProfit >= 0 ? 'rise' : 'fall'">
            {{ formatProfit(calc.todayProfit) }}
          </text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">昨日收益</text>
          <text class="holding-item__value">--</text>
        </view>
        <view class="holding-item">
          <text class="holding-item__label">持有天数</text>
          <text class="holding-item__value">{{ holdingDays }}</text>
        </view>
      </view>
    </view>

    <!-- Tab 切换区域 -->
    <view class="section chart-section">
      <view class="tabs">
        <view v-for="tab in tabs" :key="tab.key" class="tab-item" :class="{ 'tab-item--active': activeTab === tab.key }"
          @click="activeTab = tab.key">
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 关联涨幅 Tab -->
      <view v-if="activeTab === 'trend'" class="tab-content">
        <view class="chart-header">
          <text class="chart-date">{{ currentDate }}</text>
          <text class="chart-estimate" :class="isRise ? 'rise' : 'fall'">
            估算涨幅 {{ displayPercent }}
          </text>
        </view>

        <!-- 走势图 -->
        <view class="chart-container">
          <view class="chart-y-axis">
            <text>{{ chartMaxValue.toFixed(2) }}%</text>
            <text>0%</text>
            <text>{{ chartMinValue.toFixed(2) }}%</text>
          </view>
          <view class="chart-area">
            <!-- SVG 平滑曲线图 -->
            <view class="svg-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="chart-svg">
                <!-- 渐变定义 -->
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" :style="{ stopColor: getChangeColor(estimateChange), stopOpacity: 0.3 }" />
                    <stop offset="100%" :style="{ stopColor: getChangeColor(estimateChange), stopOpacity: 0.05 }" />
                  </linearGradient>
                </defs>
                <!-- 填充区域 -->
                <path :d="chartAreaPath" fill="url(#chartGradient)" />
                <!-- 曲线 -->
                <path :d="chartLinePath" fill="none" :stroke="getChangeColor(estimateChange)" stroke-width="0.5" />
              </svg>
              <!-- 零线 -->
              <view class="chart-zero-line" :style="{ top: zeroLinePosition + '%' }"></view>
            </view>
          </view>
        </view>

        <view class="chart-x-axis">
          <text>09:30</text>
          <text>11:30/13:00</text>
          <text>15:00</text>
        </view>
      </view>

      <!-- 业绩走势 Tab -->
      <view v-if="activeTab === 'performance'" class="tab-content">
        <view class="performance-placeholder">
          <text class="placeholder-icon">📊</text>
          <text class="placeholder-text">业绩走势图</text>
          <text class="placeholder-hint">展示基金近期业绩变化</text>
        </view>
      </view>

      <!-- 我的收益 Tab -->
      <view v-if="activeTab === 'profit'" class="tab-content">
        <view v-if="holdingData && holdingData.shares > 0" class="my-profit">
          <view class="profit-summary">
            <view class="profit-item">
              <text class="profit-label">持有收益</text>
              <text class="profit-value" :class="calc.holdingProfit >= 0 ? 'rise' : 'fall'">
                {{ formatProfit(calc.holdingProfit) }}
              </text>
            </view>
            <view class="profit-item">
              <text class="profit-label">收益率</text>
              <text class="profit-value" :class="calc.holdingProfitRate >= 0 ? 'rise' : 'fall'">
                {{ formatRate(calc.holdingProfitRate) }}
              </text>
            </view>
          </view>
        </view>
        <view v-else class="no-holding-tip" @click="showEditModal = true">
          <text class="placeholder-icon">💰</text>
          <text class="placeholder-text">尚未设置持仓</text>
          <text class="placeholder-hint">点击设置持仓份额，查看收益</text>
        </view>
      </view>
    </view>

    <!-- 关联板块 -->
    <view v-if="sectorInfo" class="section sector-section">
      <view class="sector-header">
        <text class="sector-label">关联板块：</text>
        <text class="sector-name">{{ sectorInfo.sectorName }}</text>
        <text class="sector-change" :class="sectorInfo.sectorChange >= 0 ? 'rise' : 'fall'">
          {{ formatRate(sectorInfo.sectorChange) }}
        </text>
        <view class="sector-more">
          <text>同类基金 ></text>
        </view>
      </view>
    </view>

    <!-- 基金重仓股 -->
    <view class="section holdings-section">
      <view class="section-header">
        <text class="section-title">■ 基金重仓股</text>
        <text class="section-more">更多 ></text>
      </view>

      <view class="stock-table">
        <view class="stock-table-header">
          <text class="stock-col stock-col--name">股票名称</text>
          <text class="stock-col">涨幅</text>
          <text class="stock-col">持仓占比</text>
          <text class="stock-col">较上期占比</text>
        </view>

        <view v-for="stock in stockHoldings" :key="stock.stockCode" class="stock-row">
          <view class="stock-col stock-col--name">
            <text class="stock-name">{{ stock.stockName }}</text>
            <text class="stock-code">{{ stock.stockCode }}</text>
          </view>
          <text class="stock-col" :class="stock.holdChange >= 0 ? 'fall' : 'rise'">
            {{ formatRate(-stock.holdChange * 3) }}
          </text>
          <text class="stock-col">{{ stock.holdRatio.toFixed(2) }}%</text>
          <view class="stock-col stock-change">
            <text :class="stock.changeType === 'up' ? 'rise' : stock.changeType === 'down' ? 'fall' : ''">
              {{ formatRate(stock.holdChange) }}
            </text>
            <text class="change-arrow">
              {{ stock.changeType === 'up' ? '↑' : stock.changeType === 'down' ? '↓' : '' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="bottom-bar__item" @click="showEditModal = true">
        <text class="bottom-bar__icon">✏️</text>
        <text class="bottom-bar__text">修改持仓</text>
      </view>
      <view class="bottom-bar__item">
        <text class="bottom-bar__icon">🔔</text>
        <text class="bottom-bar__text">提醒</text>
      </view>
      <view class="bottom-bar__item">
        <text class="bottom-bar__icon">📋</text>
        <text class="bottom-bar__text">交易记录</text>
      </view>
      <view class="bottom-bar__item" @click="deleteFund" v-if="isAdded">
        <text class="bottom-bar__icon">🗑️</text>
        <text class="bottom-bar__text">删自选</text>
      </view>
      <view class="bottom-bar__item" @click="toggleFund" v-else>
        <text class="bottom-bar__icon">+</text>
        <text class="bottom-bar__text">添加</text>
      </view>
      <view class="bottom-bar__item">
        <text class="bottom-bar__icon">⋯</text>
        <text class="bottom-bar__text">更多</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 编辑持仓弹窗 -->
    <view v-if="showEditModal" class="modal-mask" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">设置持仓</text>
          <text class="modal-close" @click="closeEditModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">持有份额</text>
            <input class="form-input" type="digit" v-model="editShares" placeholder="请输入持有份额" />
          </view>

          <view class="form-item">
            <text class="form-label">成本价（买入均价）</text>
            <input class="form-input" type="digit" v-model="editCostPrice" placeholder="请输入成本价" />
          </view>

          <view class="form-tip">
            💡 成本价 = 总投入金额 ÷ 持有份额
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-btn modal-btn--cancel" @click="closeEditModal">取消</view>
          <view class="modal-btn modal-btn--confirm" @click="saveHolding">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import {
  getFundEstimate,
  getFundDayTrend,
  getFundStockHoldings,
  getFundSector,
  type FundEstimate,
  type ChartPoint,
  type StockHolding,
  type SectorInfo
} from '@/api/fund';
import {
  addMyFund,
  removeMyFund,
  isFundAdded,
  getFundHolding,
  updateFundHolding,
  calculateHolding,
  type FundHolding,
  type HoldingCalculation
} from '@/utils/storage';

// 页面参数
const code = ref('');
const name = ref('');

// 状态
const loading = ref(true);
const refreshing = ref(false);
const fundData = ref<FundEstimate | null>(null);
const holdingData = ref<FundHolding | null>(null);
const isAdded = ref(false);
const showEditModal = ref(false);
const editShares = ref('');
const editCostPrice = ref('');
let refreshTimer: number | null = null;

// Tab 状态
const activeTab = ref('trend');
const tabs = [
  { key: 'trend', label: '关联涨幅' },
  { key: 'performance', label: '业绩走势' },
  { key: 'profit', label: '我的收益' }
];

// 走势图数据
const chartPoints = ref<ChartPoint[]>([]);

// 重仓股数据
const stockHoldings = ref<StockHolding[]>([]);

// 关联板块
const sectorInfo = ref<SectorInfo | null>(null);

// 当前日期
const currentDate = computed(() => {
  const now = new Date();
  return `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
});

// 走势图边界值
const chartMaxValue = computed(() => {
  if (chartPoints.value.length === 0) return 5;
  const max = Math.max(...chartPoints.value.map(p => p.value));
  return Math.max(Math.abs(max), 1) * 1.2;
});

const chartMinValue = computed(() => {
  if (chartPoints.value.length === 0) return -5;
  const min = Math.min(...chartPoints.value.map(p => p.value));
  return Math.min(min, 0) * 1.2;
});

// 估值涨跌数值
const estimateChange = computed(() => {
  return parseFloat(fundData.value?.gszzl || '0');
});

// 获取涨跌颜色
const getChangeColor = (change: number) => {
  return change >= 0 ? '#f5222d' : '#52c41a';
};

// 零线位置（百分比）
const zeroLinePosition = computed(() => {
  const range = chartMaxValue.value - chartMinValue.value;
  if (range === 0) return 50;
  return ((chartMaxValue.value - 0) / range) * 100;
});

// 生成 SVG 曲线路径
const chartLinePath = computed(() => {
  if (chartPoints.value.length < 2) return '';

  const range = chartMaxValue.value - chartMinValue.value;
  if (range === 0) return '';

  const points = chartPoints.value.map((p, i) => {
    const x = (i / (chartPoints.value.length - 1)) * 100;
    const y = ((chartMaxValue.value - p.value) / range) * 100;
    return { x, y };
  });

  // 生成平滑曲线（使用二次贝塞尔曲线）
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    path += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  // 连接到最后一个点
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
});

// 生成 SVG 填充区域路径
const chartAreaPath = computed(() => {
  if (chartPoints.value.length < 2) return '';

  const range = chartMaxValue.value - chartMinValue.value;
  if (range === 0) return '';

  const zeroY = zeroLinePosition.value;
  const points = chartPoints.value.map((p, i) => {
    const x = (i / (chartPoints.value.length - 1)) * 100;
    const y = ((chartMaxValue.value - p.value) / range) * 100;
    return { x, y };
  });

  // 从零线开始
  let path = `M 0 ${zeroY}`;
  // 连接到第一个点
  path += ` L ${points[0].x} ${points[0].y}`;
  // 画曲线
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    path += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  // 连接到最后一个点
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  // 连回零线
  path += ` L 100 ${zeroY} Z`;

  return path;
});


// 计算收益
const calc = computed<HoldingCalculation>(() => {
  if (holdingData.value && fundData.value) {
    return calculateHolding(holdingData.value, fundData.value);
  }
  return {
    holdingAmount: 0,
    holdingProfit: 0,
    holdingProfitRate: 0,
    todayProfit: 0,
    costAmount: 0
  };
});

// 持有天数
const holdingDays = computed(() => {
  if (!holdingData.value) return '--';
  const days = Math.floor((Date.now() - holdingData.value.addTime) / (1000 * 60 * 60 * 24));
  return days.toString();
});

// 涨跌判断
const isRise = computed(() => {
  const percent = parseFloat(fundData.value?.gszzl || '0');
  return percent >= 0;
});

const displayPercent = computed(() => {
  const percent = parseFloat(fundData.value?.gszzl || '0');
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
});

// 格式化函数
const formatMoney = (value: number) => value.toFixed(2);
const formatProfit = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};
const formatRate = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// 加载数据
const loadData = async (showLoading = true) => {
  if (showLoading) loading.value = true;
  else refreshing.value = true;

  try {
    // 并行加载所有数据
    const [estimate, trend, holdings, sector] = await Promise.all([
      getFundEstimate(code.value),
      getFundDayTrend(code.value),
      getFundStockHoldings(code.value),
      getFundSector(code.value)
    ]);

    fundData.value = estimate;
    chartPoints.value = trend;
    stockHoldings.value = holdings;
    sectorInfo.value = sector;
    isAdded.value = isFundAdded(code.value);
    holdingData.value = getFundHolding(code.value) || null;
  } catch (e) {
    if (showLoading) uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

// 刷新
const onRefresh = () => {
  loadData(false);
  uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 });
};

// 自动刷新
const setupAutoRefresh = () => {
  refreshTimer = setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isTradingTime =
      (hour === 9 && minute >= 30) || (hour === 10) || (hour === 11 && minute <= 30) ||
      (hour >= 13 && hour < 15);
    if (isTradingTime) loadData(false);
  }, 60000) as unknown as number;
};

// 保存持仓
const saveHolding = () => {
  const shares = parseFloat(editShares.value) || 0;
  const costPrice = parseFloat(editCostPrice.value) || 0;

  if (shares < 0 || costPrice < 0) {
    uni.showToast({ title: '请输入正确的数值', icon: 'none' });
    return;
  }

  if (!isAdded.value && fundData.value) {
    addMyFund({ code: code.value, name: fundData.value.name, shares, costPrice });
    isAdded.value = true;
  } else {
    updateFundHolding(code.value, shares, costPrice);
  }

  holdingData.value = getFundHolding(code.value) || null;
  uni.showToast({ title: '保存成功', icon: 'success' });
  closeEditModal();
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const toggleFund = () => {
  if (!fundData.value) return;
  addMyFund({ code: fundData.value.fundcode, name: fundData.value.name });
  isAdded.value = true;
  holdingData.value = getFundHolding(code.value) || null;
  uni.showToast({ title: '添加成功', icon: 'success' });
};

const deleteFund = () => {
  uni.showModal({
    title: '提示',
    content: '确定删除该基金吗？',
    success: (res) => {
      if (res.confirm) {
        removeMyFund(code.value);
        isAdded.value = false;
        holdingData.value = null;
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    }
  });
};

const goBack = () => uni.navigateBack();
const goToSearch = () => uni.navigateTo({ url: '/pages/search/search' });

// 生命周期
onLoad((options) => {
  code.value = options?.code || '';
  name.value = decodeURIComponent(options?.name || '');
  if (code.value) {
    loadData();
    setupAutoRefresh();
  }
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
}

.header {
  padding: 24rpx;
  padding-top: 60rpx;
  color: #fff;
}

.header--rise {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.header--fall {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.header__nav {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.header__back,
.header__action {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.header__center {
  flex: 1;
  text-align: center;
}

.header__name {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
}

.header__code {
  font-size: 24rpx;
  opacity: 0.8;
}

.header__content {
  text-align: center;
  padding: 20rpx 0;
}

.header__main {
  margin-bottom: 16rpx;
}

.header__label {
  font-size: 24rpx;
  opacity: 0.8;
  display: block;
  margin-bottom: 8rpx;
}

.header__percent {
  font-size: 72rpx;
  font-weight: 700;
}

.header__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.header__time {
  font-size: 24rpx;
  opacity: 0.8;
}

.header__refresh {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 24rpx;
}

.header__refresh--loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.section {
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.holding-section {
  padding: 20rpx;
}

.holding-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.holding-item {
  display: flex;
  flex-direction: column;
  text-align: center;
  padding: 12rpx;
}

.holding-item__label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.holding-item__value {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.rise {
  color: #f5222d;
}

.fall {
  color: #52c41a;
}

/* Tab 样式 */
.chart-section {
  padding: 0;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab-item--active {
  color: #1a73e8;
  font-weight: 600;
}

.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background: #1a73e8;
  border-radius: 2rpx;
}

.tab-content {
  padding: 24rpx;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.chart-date {
  font-size: 26rpx;
  color: #666;
}

.chart-estimate {
  font-size: 26rpx;
  font-weight: 600;
}

.chart-container {
  display: flex;
  height: 300rpx;
  margin-bottom: 16rpx;
}

.chart-y-axis {
  width: 80rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding-right: 12rpx;
  font-size: 20rpx;
  color: #999;
}

.chart-area {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8rpx;
  position: relative;
  overflow: hidden;
}

.svg-chart {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-zero-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: repeating-linear-gradient(to right,
      #ccc,
      #ccc 4px,
      transparent 4px,
      transparent 8px);
}

.chart-x-axis {
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: #999;
  padding-left: 80rpx;
}

.performance-placeholder,
.no-holding-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.placeholder-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.placeholder-hint {
  font-size: 24rpx;
  color: #999;
}

.my-profit {
  padding: 20rpx 0;
}

.profit-summary {
  display: flex;
  justify-content: space-around;
}

.profit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profit-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.profit-value {
  font-size: 40rpx;
  font-weight: 700;
}

/* 关联板块 */
.sector-section {
  padding: 20rpx 24rpx;
}

.sector-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.sector-label {
  font-size: 26rpx;
  color: #666;
}

.sector-name {
  font-size: 26rpx;
  color: #1a73e8;
  font-weight: 500;
}

.sector-change {
  font-size: 26rpx;
  font-weight: 600;
}

.sector-more {
  flex: 1;
  text-align: right;
  font-size: 24rpx;
  color: #999;
}

/* 重仓股 */
.holdings-section {
  padding: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #999;
}

.stock-table {
  font-size: 24rpx;
}

.stock-table-header {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  color: #999;
}

.stock-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.stock-col {
  flex: 1;
  text-align: right;
}

.stock-col--name {
  flex: 1.5;
  text-align: left;
}

.stock-name {
  font-size: 26rpx;
  color: #333;
  display: block;
}

.stock-code {
  font-size: 22rpx;
  color: #999;
}

.stock-change {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
}

.change-arrow {
  font-size: 20rpx;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 12rpx 0;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.bottom-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.bottom-bar__icon {
  font-size: 32rpx;
}

.bottom-bar__text {
  font-size: 20rpx;
  color: #666;
}

/* 加载和弹窗样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e8e8e8;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.modal-body {
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-tip {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  padding: 12rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}

.modal-btn--cancel {
  color: #666;
  border-right: 1rpx solid #f0f0f0;
}

.modal-btn--confirm {
  color: #1a73e8;
  font-weight: 600;
}
</style>
