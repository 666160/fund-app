<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-bar__back" @click="goBack">
        <text>←</text>
      </view>
      <view class="search-bar__input-wrap">
        <text class="search-bar__icon">🔍</text>
        <input class="search-bar__input" type="text" v-model="keyword" placeholder="输入基金代码或名称" confirm-type="search"
          @confirm="onSearch" @input="onInput" focus />
        <text v-if="keyword" class="search-bar__clear" @click="clearKeyword">✕</text>
      </view>
    </view>

    <!-- 热门基金 (无输入时显示) -->
    <view v-if="!keyword" class="section">
      <view class="section__title">🔥 热门基金</view>
      <view class="fund-list">
        <view v-for="fund in hotFunds" :key="fund.code" class="fund-item" @click="onSelectFund(fund)">
          <view class="fund-item__info">
            <text class="fund-item__code">{{ fund.code }}</text>
            <text class="fund-item__name">{{ fund.name }}</text>
          </view>
          <view class="fund-item__action" :class="{ 'fund-item__action--added': isAdded(fund.code) }"
            @click.stop="toggleFund(fund)">
            <text>{{ isAdded(fund.code) ? '已添加' : '+ 添加' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="section">
      <view class="section__title">搜索结果</view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading">
        <view class="loading-spinner"></view>
        <text class="loading-text">搜索中...</text>
      </view>

      <!-- 搜索结果列表 -->
      <view v-else-if="searchList.length > 0" class="fund-list">
        <view v-for="fund in searchList" :key="fund.code" class="fund-item" @click="onSelectFund(fund)">
          <view class="fund-item__info">
            <text class="fund-item__code">{{ fund.code }}</text>
            <text class="fund-item__name">{{ fund.name }}</text>
            <text v-if="fund.type" class="fund-item__type">{{ fund.type }}</text>
          </view>
          <view class="fund-item__action" :class="{ 'fund-item__action--added': isAdded(fund.code) }"
            @click.stop="toggleFund(fund)">
            <text>{{ isAdded(fund.code) ? '已添加' : '+ 添加' }}</text>
          </view>
        </view>
      </view>

      <!-- 无结果 -->
      <view v-else-if="searched && searchList.length === 0" class="empty">
        <text class="empty__icon">😔</text>
        <text class="empty__text">未找到相关基金</text>
        <text class="empty__hint">请检查基金代码是否正确</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { searchFunds, HOT_FUNDS, type SearchResult } from '@/api/fund';
import { addMyFund, removeMyFund, isFundAdded } from '@/utils/storage';

// 状态
const keyword = ref('');
const loading = ref(false);
const searched = ref(false);
const searchList = ref<SearchResult[]>([]);
const hotFunds = ref(HOT_FUNDS);
const addedFunds = ref<Set<string>>(new Set());

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// 初始化已添加状态
const refreshAddedStatus = () => {
  addedFunds.value = new Set(
    HOT_FUNDS.filter(f => isFundAdded(f.code)).map(f => f.code)
  );
};

refreshAddedStatus();

// 检查是否已添加
const isAdded = (code: string): boolean => {
  return isFundAdded(code);
};

// 搜索 (防抖)
const doSearch = async () => {
  const code = keyword.value.trim();
  if (!code) {
    searchList.value = [];
    searched.value = false;
    return;
  }

  loading.value = true;
  searched.value = true;

  try {
    const results = await searchFunds(code);
    searchList.value = results;
  } catch (e: any) {
    searchList.value = [];
    console.error('搜索失败:', e);
  } finally {
    loading.value = false;
  }
};

// 确认搜索
const onSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  doSearch();
};

// 输入变化 (防抖实时搜索)
const onInput = () => {
  if (!keyword.value) {
    searched.value = false;
    searchList.value = [];
    return;
  }

  // 防抖：300ms 后触发搜索
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    doSearch();
  }, 300);
};

// 清除关键词
const clearKeyword = () => {
  keyword.value = '';
  searched.value = false;
  searchList.value = [];
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};

// 切换基金添加状态
const toggleFund = (fund: { code: string; name: string }) => {
  if (isAdded(fund.code)) {
    removeMyFund(fund.code);
    addedFunds.value.delete(fund.code);
    uni.showToast({ title: '已移除', icon: 'success' });
  } else {
    addMyFund(fund);
    addedFunds.value.add(fund.code);
    uni.showToast({ title: '添加成功', icon: 'success' });
  }
  // 强制更新
  addedFunds.value = new Set(addedFunds.value);
};

// 选择基金查看详情
const onSelectFund = (fund: { code: string; name: string }) => {
  uni.navigateTo({
    url: `/pages/detail/detail?code=${fund.code}&name=${encodeURIComponent(fund.name)}`
  });
};

// 返回
const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-top: 80rpx;
}

.search-bar__back {
  color: #fff;
  font-size: 36rpx;
  padding: 16rpx;
  margin-right: 12rpx;
}

.search-bar__input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
}

.search-bar__icon {
  color: #999;
  font-size: 32rpx;
  margin-right: 12rpx;
}

.search-bar__input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.search-bar__clear {
  color: #999;
  font-size: 28rpx;
  padding: 8rpx;
}

.section {
  padding: 24rpx;
}

.section__title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.fund-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.fund-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.fund-item:last-child {
  border-bottom: none;
}

.fund-item__info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.fund-item__code {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.fund-item__name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.fund-item__type {
  font-size: 22rpx;
  color: #667eea;
  margin-top: 4rpx;
}

.fund-item__action {
  font-size: 24rpx;
  color: #667eea;
  padding: 12rpx 24rpx;
  border: 1rpx solid #667eea;
  border-radius: 30rpx;
  flex-shrink: 0;
  margin-left: 20rpx;
}

.fund-item__action--added {
  color: #999;
  border-color: #ddd;
  background: #f5f5f5;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  background: #fff;
  border-radius: 20rpx;
}

.empty__icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty__text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.empty__hint {
  font-size: 24rpx;
  color: #999;
}
</style>
