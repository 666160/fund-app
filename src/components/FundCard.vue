<template>
  <view class="fund-card" :class="{ 'fund-card--rise': isRise, 'fund-card--fall': !isRise }" @click="onClick">
    <view class="fund-card__header">
      <view class="fund-card__name">{{ fund.name }}</view>
      <view class="fund-card__code">{{ fund.fundcode }}</view>
    </view>
    
    <view class="fund-card__body">
      <view class="fund-card__values">
        <view class="fund-card__item">
          <text class="fund-card__label">估算净值</text>
          <text class="fund-card__value fund-card__gsz">{{ fund.gsz || '--' }}</text>
        </view>
        <view class="fund-card__item">
          <text class="fund-card__label">单位净值</text>
          <text class="fund-card__value">{{ fund.dwjz || '--' }}</text>
        </view>
      </view>
      
      <view class="fund-card__change" :class="changeClass">
        <text class="fund-card__arrow">{{ isRise ? '↑' : '↓' }}</text>
        <text class="fund-card__percent">{{ displayPercent }}</text>
      </view>
    </view>
    
    <view class="fund-card__footer">
      <text class="fund-card__time">{{ fund.gztime || '暂无数据' }}</text>
      <view v-if="showDelete" class="fund-card__delete" @click.stop="onDelete">
        <text>删除</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FundEstimate } from '@/api/fund';

const props = defineProps<{
  fund: FundEstimate;
  showDelete?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', fund: FundEstimate): void;
  (e: 'delete', fund: FundEstimate): void;
}>();

// 判断涨跌
const isRise = computed(() => {
  const percent = parseFloat(props.fund.gszzl || '0');
  return percent >= 0;
});

// 涨跌幅样式
const changeClass = computed(() => isRise.value ? 'rise' : 'fall');

// 显示涨跌幅
const displayPercent = computed(() => {
  const percent = parseFloat(props.fund.gszzl || '0');
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
});

const onClick = () => {
  emit('click', props.fund);
};

const onDelete = () => {
  emit('delete', props.fund);
};
</script>

<style scoped>
.fund-card {
  background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 20rpx;
  padding: 28rpx;
  margin: 20rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 6rpx solid transparent;
}

.fund-card--rise {
  border-left-color: #f5222d;
}

.fund-card--fall {
  border-left-color: #52c41a;
}

.fund-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.fund-card__header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.fund-card__name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-card__code {
  font-size: 24rpx;
  color: #999;
  background: #f0f0f0;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.fund-card__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fund-card__values {
  display: flex;
  gap: 40rpx;
}

.fund-card__item {
  display: flex;
  flex-direction: column;
}

.fund-card__label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.fund-card__value {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.fund-card__gsz {
  font-size: 36rpx;
  font-weight: 700;
}

.fund-card__change {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  font-weight: 600;
}

.fund-card__change.rise {
  background: rgba(245, 34, 45, 0.1);
  color: #f5222d;
}

.fund-card__change.fall {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.fund-card__arrow {
  font-size: 28rpx;
  margin-right: 6rpx;
}

.fund-card__percent {
  font-size: 36rpx;
}

.fund-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.fund-card__time {
  font-size: 22rpx;
  color: #bbb;
}

.fund-card__delete {
  font-size: 24rpx;
  color: #f5222d;
  padding: 8rpx 20rpx;
  border: 1rpx solid #f5222d;
  border-radius: 20rpx;
}
</style>
