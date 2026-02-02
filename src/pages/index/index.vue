<template>
  <view class="index-page">
    <!-- 头部账户资产汇总 -->
    <view class="header">
      <view class="header__top">
        <text class="header__title">💰 养基宝</text>
        <view class="header__actions">
          <view class="header__btn" @click="goToSearch">
            <text>🔍</text>
          </view>
        </view>
      </view>

      <view class="account-summary">
        <view class="account-summary__main">
          <view class="account-summary__label">
            <text>账户资产</text>
            <text class="account-summary__eye" @click="toggleHidden">{{ isHidden ? '👁️' : '👁️‍🗨️' }}</text>
          </view>
          <text class="account-summary__amount">
            {{ isHidden ? '****' : formatMoney(totalAssets) }}
          </text>
        </view>

        <view class="account-summary__stats">
          <view class="account-summary__item">
            <text class="account-summary__item-label">当日收益</text>
            <text class="account-summary__item-value" :class="totalTodayProfit >= 0 ? 'rise' : 'fall'">
              {{ isHidden ? '****' : formatProfit(totalTodayProfit) }}
            </text>
          </view>
          <view class="account-summary__item">
            <text class="account-summary__item-label">持有收益</text>
            <text class="account-summary__item-value" :class="totalProfit >= 0 ? 'rise' : 'fall'">
              {{ isHidden ? '****' : formatProfit(totalProfit) }}
            </text>
          </view>
          <view class="account-summary__item">
            <text class="account-summary__item-label">收益率</text>
            <text class="account-summary__item-value" :class="totalProfitRate >= 0 ? 'rise' : 'fall'">
              {{ isHidden ? '****' : formatRate(totalProfitRate) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 表头 -->
    <view v-if="fundList.length > 0" class="list-header">
      <text class="list-header__name">基金名称</text>
      <text class="list-header__col">当日涨幅</text>
      <text class="list-header__col">当日收益</text>
      <text class="list-header__col">持有收益</text>
    </view>

    <!-- 基金列表 -->
    <scroll-view class="fund-list" scroll-y :refresher-enabled="true" :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh">
      <!-- 空状态 -->
      <view v-if="!loading && fundList.length === 0" class="empty-state">
        <text class="empty-icon">📊</text>
        <text class="empty-text">暂无持仓基金</text>
        <text class="empty-hint">添加基金并设置持仓份额，开始追踪收益</text>
        <view class="empty-btn" @click="goToSearch">
          <text>+ 添加基金</text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 持仓卡片 -->
      <view v-for="item in fundList" :key="item.fund.fundcode" class="holding-card" @click="goToDetail(item)">
        <view class="holding-card__header">
          <view class="holding-card__name-wrap">
            <text class="holding-card__name">{{ item.fund.name }}</text>
            <text class="holding-card__code">{{ item.fund.fundcode }}</text>
          </view>
        </view>

        <view class="holding-card__body">
          <view class="holding-card__row">
            <view class="holding-card__info">
              <text class="holding-card__amount">¥{{ formatMoney(item.calc.holdingAmount) }}</text>
              <text class="holding-card__shares">{{ item.holding.shares.toFixed(2) }}份</text>
            </view>

            <view class="holding-card__col">
              <view class="rate-wrap">
                <text class="holding-card__rate" :class="parseFloat(item.fund.gszzl) >= 0 ? 'rise' : 'fall'">
                  {{ formatRate(parseFloat(item.fund.gszzl)) }}
                </text>
                <text v-if="item.fund.isActual" class="actual-tag">实</text>
              </view>
            </view>

            <view class="holding-card__col">
              <text class="holding-card__profit" :class="item.calc.todayProfit >= 0 ? 'rise' : 'fall'">
                {{ formatProfit(item.calc.todayProfit) }}
              </text>
            </view>

            <view class="holding-card__col">
              <text class="holding-card__profit" :class="item.calc.holdingProfit >= 0 ? 'rise' : 'fall'">
                {{ formatProfit(item.calc.holdingProfit) }}
              </text>
              <text class="holding-card__rate-small" :class="item.calc.holdingProfitRate >= 0 ? 'rise' : 'fall'">
                {{ formatRate(item.calc.holdingProfitRate) }}
              </text>
            </view>
          </view>
        </view>

        <!-- 未设置持仓提示 -->
        <view v-if="item.holding.shares === 0" class="holding-card__tip" @click.stop="editHolding(item)">
          <text>💡 点击设置持仓份额</text>
        </view>
      </view>
    </scroll-view>

    <!-- 添加按钮 -->
    <view class="fab" @click="goToSearch">
      <text class="fab__icon">+</text>
    </view>

    <!-- 编辑持仓弹窗 -->
    <view v-if="showEditModal" class="modal-mask" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">设置持仓</text>
          <text class="modal-close" @click="closeEditModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="modal-fund-name">{{ editingFund?.fund.name }}</view>

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
          <view v-if="isFundAdded(editingFund?.fund.fundcode || '')" class="modal-btn delete" @click="deleteFund">删除
          </view>
          <view class="modal-btn confirm" @click="saveHolding">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getFundEstimate, type FundEstimate } from '@/api/fund';
import {
  getMyFunds,
  addMyFund,
  updateFundHolding,
  removeMyFund,
  getFundHolding,
  isFundAdded,
  calculateHolding,
  calculateTotalAssets,
  type FundHolding,
  type HoldingCalculation
} from '@/utils/storage';

// ... (HoldingItem interface and state refs remain same) ...

// 持仓项
interface HoldingItem {
  holding: FundHolding;
  fund: FundEstimate;
  calc: HoldingCalculation;
}

// 状态
const loading = ref(false);
const isRefreshing = ref(false);
const isHidden = ref(false);
const myFunds = ref<FundHolding[]>([]);
const fundList = ref<HoldingItem[]>([]);
const estimateMap = ref<Map<string, FundEstimate>>(new Map());

// 编辑弹窗状态
const showEditModal = ref(false);
const editingFund = ref<HoldingItem | null>(null);
const editShares = ref('');
const editCostPrice = ref('');

// 汇总数据
const totalAssets = ref(0);
const totalProfit = ref(0);
const totalTodayProfit = ref(0);
const totalProfitRate = ref(0);

// 格式化金额
const formatMoney = (value: number) => {
  return value.toFixed(2);
};

// 格式化收益（带符号）
const formatProfit = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};

// 格式化收益率
const formatRate = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// 切换隐藏
const toggleHidden = () => {
  isHidden.value = !isHidden.value;
};

// 加载数据
const loadFunds = async () => {
  myFunds.value = getMyFunds();

  if (myFunds.value.length === 0) {
    fundList.value = [];
    totalAssets.value = 0;
    totalProfit.value = 0;
    totalTodayProfit.value = 0;
    totalProfitRate.value = 0;
    return;
  }

  loading.value = true;

  try {
    const results = await Promise.allSettled(
      myFunds.value.map(f => getFundEstimate(f.code, true)) // 开启真实净值校准
    );

    const map = new Map<string, FundEstimate>();
    const list: HoldingItem[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const fund = result.value;
        const holding = myFunds.value[index];
        map.set(fund.fundcode, fund);

        const calc = calculateHolding(holding, fund);
        list.push({ holding, fund, calc });
      }
    });

    estimateMap.value = map;
    fundList.value = list;

    // 计算汇总
    const totals = calculateTotalAssets(myFunds.value, map);
    totalAssets.value = totals.totalAssets;
    totalProfit.value = totals.totalProfit;
    totalTodayProfit.value = totals.totalTodayProfit;
    totalProfitRate.value = totals.totalProfitRate;

  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true;
  await loadFunds();
  isRefreshing.value = false;
  uni.showToast({ title: '刷新成功', icon: 'success' });
};

// 编辑持仓
const editHolding = (item: HoldingItem) => {
  editingFund.value = item;
  editShares.value = item.holding.shares > 0 ? item.holding.shares.toString() : '';
  editCostPrice.value = item.holding.costPrice > 0 ? item.holding.costPrice.toString() : '';
  showEditModal.value = true;
};

// 关闭弹窗
const closeEditModal = () => {
  showEditModal.value = false;
  editingFund.value = null;
};

// 保存持仓
const saveHolding = () => {
  const shares = parseFloat(editShares.value) || 0;
  const costPrice = parseFloat(editCostPrice.value) || 0;

  if (shares < 0 || costPrice < 0) {
    uni.showToast({ title: '请输入正确的数值', icon: 'none' });
    return;
  }

  if (editingFund.value && !isFundAdded(editingFund.value.fund.fundcode)) {
    addMyFund({
      code: editingFund.value.fund.fundcode,
      name: editingFund.value.fund.name,
      shares,
      costPrice
    });
  } else if (editingFund.value) {
    updateFundHolding(editingFund.value.holding.code, shares, costPrice);
  }

  uni.showToast({ title: '保存成功', icon: 'success' });
  closeEditModal();
  loadFunds();
};

// 删除持仓
const deleteFund = () => {
  if (!editingFund.value) return;

  uni.showModal({
    title: '提示',
    content: '确定删除该基金吗？',
    success: (res) => {
      if (res.confirm) {
        removeMyFund(editingFund.value!.fund.fundcode);
        uni.showToast({ title: '已删除', icon: 'success' });
        closeEditModal();
        loadFunds();
      }
    }
  });
};

// 跳转搜索页
const goToSearch = () => {
  uni.navigateTo({ url: '/pages/search/search' });
};

// 跳转详情页
const goToDetail = (item: HoldingItem) => {
  uni.navigateTo({
    url: `/pages/detail/detail?code=${item.fund.fundcode}&name=${encodeURIComponent(item.fund.name)}`
  });
};

// 页面显示时刷新数据
onShow(() => {
  loadFunds();
});
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  padding: 60rpx 24rpx 30rpx;
  color: #fff;
}

.header__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.header__title {
  font-size: 36rpx;
  font-weight: 600;
}

.header__btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 28rpx;
}

.account-summary {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
}

.account-summary__main {
  margin-bottom: 20rpx;
}

.account-summary__label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  opacity: 0.8;
  margin-bottom: 8rpx;
}

.account-summary__eye {
  font-size: 24rpx;
}

.account-summary__amount {
  font-size: 56rpx;
  font-weight: 700;
}

.account-summary__stats {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.account-summary__item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.account-summary__item-label {
  font-size: 22rpx;
  opacity: 0.8;
  margin-bottom: 6rpx;
}

.account-summary__item-value {
  font-size: 28rpx;
  font-weight: 600;
}

.account-summary__item-value.rise {
  color: #ff6b6b;
}

.account-summary__item-value.fall {
  color: #4ade80;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  font-size: 22rpx;
  color: #999;
  border-bottom: 1rpx solid #f0f0f0;
}

.list-header__name {
  flex: 1.5;
}

.list-header__col {
  flex: 1;
  text-align: right;
}

.fund-list {
  height: calc(100vh - 420rpx);
}

.holding-card {
  background: #fff;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.holding-card__header {
  margin-bottom: 12rpx;
}

.holding-card__name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.holding-card__name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.holding-card__code {
  font-size: 22rpx;
  color: #999;
}

.holding-card__body {
  display: flex;
}

.holding-card__row {
  display: flex;
  align-items: center;
  width: 100%;
}

.holding-card__info {
  flex: 1.5;
  display: flex;
  flex-direction: column;
}

.holding-card__amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.holding-card__shares {
  font-size: 22rpx;
  color: #999;
}

.holding-card__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.holding-card__rate {
  font-size: 28rpx;
  font-weight: 600;
}

.holding-card__profit {
  font-size: 28rpx;
  font-weight: 600;
}

.holding-card__rate-small {
  font-size: 20rpx;
}

.rise {
  color: #f5222d;
}

.fall {
  color: #52c41a;
}

.holding-card__tip {
  margin-top: 12rpx;
  padding: 12rpx;
  background: #fff7e6;
  border-radius: 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #fa8c16;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
  text-align: center;
}

.empty-btn {
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  color: #fff;
  padding: 24rpx 60rpx;
  border-radius: 50rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(26, 115, 232, 0.4);
}

.fab__icon {
  font-size: 56rpx;
  color: #fff;
  font-weight: 300;
}

/* 弹窗样式 */
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

.modal-fund-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 24rpx;
  text-align: center;
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

.rate-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
}

.actual-tag {
  font-size: 18rpx;
  color: #f5222d;
  background: rgba(245, 34, 45, 0.1);
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
  border: 1rpx solid rgba(245, 34, 45, 0.2);
  line-height: 1;
}
</style>
