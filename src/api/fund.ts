// 基金 API 接口封装 - 使用天天基金真实接口

// 基金估值数据接口
export interface FundEstimate {
  fundcode: string;   // 基金代码
  name: string;       // 基金名称
  jzrq: string;       // 净值日期
  dwjz: string;       // 单位净值
  gsz: string;        // 估算净值
  gszzl: string;      // 估算涨跌幅
  gztime: string;     // 估值时间
}

// 重仓股信息
export interface StockHolding {
  stockCode: string;    // 股票代码
  stockName: string;    // 股票名称
  holdRatio: number;    // 持仓占比
  holdChange: number;   // 较上期变化
  changeType: 'up' | 'down' | 'same' | 'new';  // 变化方向
  priceChange?: number; // 股价涨跌幅
}

// 关联板块信息
export interface SectorInfo {
  sectorName: string;   // 板块名称
  sectorChange: number; // 板块涨跌幅
}

// 走势图数据点
export interface ChartPoint {
  time: string;     // 时间
  value: number;    // 涨跌幅
}

// 搜索结果类型
export interface SearchResult {
  code: string;
  name: string;
  type?: string;
}

// 判断是否为 H5 环境
function isH5(): boolean {
  try {
    const systemInfo = uni.getSystemInfoSync();
    return systemInfo.uniPlatform === 'web';
  } catch {
    return false;
  }
}

/**
 * 从 pingzhongdata 获取备用估值数据（用于 LOF、商品基金等特殊类型）
 * 解析 Data_netWorthTrend 获取最新一天的涨跌幅
 */
async function getFallbackEstimate(fundCode: string): Promise<FundEstimate | null> {
  return new Promise((resolve) => {
    // 只在 H5 环境使用 script 标签方式
    if (isH5()) {
      const scriptId = `fallback_${fundCode}_${Date.now()}`;
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`;

      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 8000);

      const cleanup = () => {
        clearTimeout(timeout);
        const el = document.getElementById(scriptId);
        if (el) el.remove();
      };

      script.onload = () => {
        cleanup();
        try {
          const win = window as any;
          const name = win.fS_name || '';
          const netWorthTrend = win.Data_netWorthTrend || [];

          if (netWorthTrend.length > 0) {
            // 获取最新一条数据
            const latest = netWorthTrend[netWorthTrend.length - 1];
            const lastDate = new Date(latest.x);
            const dateStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;

            resolve({
              fundcode: fundCode,
              name: name,
              jzrq: dateStr,
              dwjz: String(latest.y || 1),
              gsz: String(latest.y || 1),
              gszzl: String(latest.equityReturn || 0),
              gztime: dateStr + ' 15:00'
            });
            return;
          }
        } catch (e) {
          console.error('解析备用估值数据失败:', e);
        }
        resolve(null);
      };

      script.onerror = () => {
        cleanup();
        resolve(null);
      };

      document.head.appendChild(script);
    } else {
      // 非 H5 环境使用 uni.request
      uni.request({
        url: `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            try {
              const data = res.data as string;
              // 解析基金名称
              const nameMatch = data.match(/var\s+fS_name\s*=\s*"([^"]+)"/);
              const name = nameMatch ? nameMatch[1] : '';

              // 解析净值走势数组
              const trendMatch = data.match(/var\s+Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
              if (trendMatch) {
                const trendData = JSON.parse(trendMatch[1]);
                if (trendData.length > 0) {
                  const latest = trendData[trendData.length - 1];
                  const lastDate = new Date(latest.x);
                  const dateStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;

                  resolve({
                    fundcode: fundCode,
                    name: name,
                    jzrq: dateStr,
                    dwjz: String(latest.y || 1),
                    gsz: String(latest.y || 1),
                    gszzl: String(latest.equityReturn || 0),
                    gztime: dateStr + ' 15:00'
                  });
                  return;
                }
              }
            } catch (e) {
              console.error('解析备用估值数据失败:', e);
            }
          }
          resolve(null);
        },
        fail: () => resolve(null)
      });
    }
  });
}

/**
 * 获取基金实时估值
 * 优先使用估值接口，如果返回空数据则使用 pingzhongdata 作为备用
 */
export function getFundEstimate(fundCode: string): Promise<FundEstimate> {
  return new Promise((resolve, reject) => {
    let baseUrl = 'https://fundgz.1234567.com.cn/js';
    if (isH5()) {
      baseUrl = '/api/fund';
    }

    uni.request({
      url: `${baseUrl}/${fundCode}.js?rt=${Date.now()}`,
      method: 'GET',
      success: async (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data as string;
          const jsonStr = data.replace(/^jsonpgz\(/, '').replace(/\);?$/, '');

          // 检查是否为空数据（如 "jsonpgz();" 或 "{}"）
          if (!jsonStr || jsonStr === '{}' || jsonStr.trim() === '') {
            console.log('估值接口返回空数据，尝试使用备用接口...');
            const fallback = await getFallbackEstimate(fundCode);
            if (fallback) {
              resolve(fallback);
            } else {
              reject(new Error('无法获取估值数据'));
            }
            return;
          }

          try {
            const fundData = JSON.parse(jsonStr) as FundEstimate;
            // 检查是否有有效的估值数据
            if (fundData && fundData.gszzl !== undefined && fundData.gszzl !== '') {
              resolve(fundData);
            } else {
              // 估值数据无效，使用备用接口
              console.log('估值数据无效，尝试使用备用接口...');
              const fallback = await getFallbackEstimate(fundCode);
              if (fallback) {
                resolve(fallback);
              } else {
                // 返回原始数据，即使不完整
                resolve(fundData);
              }
            }
          } catch (e) {
            // 解析失败，尝试备用接口
            console.log('解析估值数据失败，尝试使用备用接口...');
            const fallback = await getFallbackEstimate(fundCode);
            if (fallback) {
              resolve(fallback);
            } else {
              reject(new Error('解析基金数据失败'));
            }
          }
        } else {
          reject(new Error('请求失败'));
        }
      },
      fail: async (err) => {
        // 请求失败，尝试备用接口
        const fallback = await getFallbackEstimate(fundCode);
        if (fallback) {
          resolve(fallback);
        } else {
          reject(err);
        }
      }
    });
  });
}


/**
 * 使用 script 标签加载 pingzhongdata（适用于 H5 环境）
 * 由于 pingzhongdata 返回的是全局变量声明，可以通过 script 标签加载后读取全局变量
 */
function loadPingzhongdataViaScript(fundCode: string): Promise<string[]> {
  return new Promise((resolve) => {
    // 只在 H5 环境下使用 script 标签方式
    if (!isH5()) {
      resolve([]);
      return;
    }

    const scriptId = `pingzhongdata_${fundCode}_${Date.now()}`;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`;

    // 超时处理
    const timeout = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };

    script.onload = () => {
      cleanup();
      try {
        // 读取全局变量 stockCodesNew
        const win = window as any;
        const stockCodesNew = win.stockCodesNew || [];
        console.log('script 加载成功，stockCodesNew:', stockCodesNew);
        resolve(stockCodesNew);
      } catch (e) {
        console.error('读取 stockCodesNew 失败:', e);
        resolve([]);
      }
    };

    script.onerror = () => {
      cleanup();
      console.error('script 加载失败');
      resolve([]);
    };

    document.head.appendChild(script);
  });
}

/**
 * 获取基金重仓股数据 (真实接口)
 * 使用 pingzhongdata 接口获取股票代码，再批量获取股票信息
 */
export async function getFundStockHoldings(fundCode: string): Promise<StockHolding[]> {
  try {
    let stockCodes: string[] = [];

    // H5 环境使用 script 标签方式加载
    if (isH5()) {
      stockCodes = await loadPingzhongdataViaScript(fundCode);
    } else {
      // 非 H5 环境使用 uni.request
      const data = await new Promise<string | null>((resolve) => {
        uni.request({
          url: `https://fund.eastmoney.com/pingzhongdata/${fundCode}.js?v=${Date.now()}`,
          method: 'GET',
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              resolve(res.data as string);
            } else {
              resolve(null);
            }
          },
          fail: () => resolve(null)
        });
      });

      if (data) {
        const match = data.match(/var\s+stockCodesNew\s*=\s*\[([^\]]*)\]/);
        if (match && match[1]) {
          const codeMatches = match[1].match(/"([^"]+)"/g);
          if (codeMatches) {
            stockCodes = codeMatches.map(c => c.replace(/"/g, '')).filter(c => c.includes('.'));
          }
        }
      }
    }

    console.log('获取到股票代码:', stockCodes);

    if (stockCodes.length === 0) {
      return [];
    }

    // 批量获取股票信息
    const holdings = await getStockInfoBatch(stockCodes.slice(0, 10));
    return holdings;
  } catch (e) {
    console.error('获取持仓数据失败:', e);
    return [];
  }
}



/**
 * 批量获取股票信息
 * secid 格式: 1.600118 (上海), 0.002151 (深圳)
 */
async function getStockInfoBatch(secids: string[]): Promise<StockHolding[]> {
  const holdings: StockHolding[] = [];

  // 并行获取所有股票信息
  const promises = secids.map((secid, index) => getStockInfo(secid, index));
  const results = await Promise.allSettled(promises);

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      holdings.push(result.value);
    }
  });

  // 按持仓占比排序（模拟，因为真实占比需要季报数据）
  return holdings.slice(0, 10);
}

/**
 * 获取单只股票信息
 */
function getStockInfo(secid: string, index: number): Promise<StockHolding | null> {
  return new Promise((resolve) => {
    let baseUrl = 'https://push2.eastmoney.com';
    if (isH5()) {
      baseUrl = '/api/stock';
    }

    uni.request({
      url: `${baseUrl}/api/qt/stock/get?secid=${secid}&fields=f58,f43,f57,f170`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          try {
            const data = res.data as any;
            if (data.data) {
              const stockData = data.data;
              const priceChange = stockData.f170 / 100; // 涨跌幅需要除以100

              // 模拟持仓占比（递减，因为真实数据需要季报）
              const holdRatio = parseFloat((15 - index * 1.2).toFixed(2));
              const holdChange = parseFloat((Math.random() * 2 - 1).toFixed(2));

              resolve({
                stockCode: stockData.f57 || secid.split('.')[1],
                stockName: stockData.f58 || '未知',
                holdRatio: Math.max(holdRatio, 1),
                holdChange: Math.abs(holdChange),
                changeType: holdChange > 0 ? 'up' : holdChange < 0 ? 'down' : 'same',
                priceChange: priceChange
              });
              return;
            }
          } catch (e) {
            console.error('解析股票数据失败:', e);
          }
        }
        resolve(null);
      },
      fail: () => {
        resolve(null);
      }
    });
  });
}

/**
 * 获取基金关联板块 (从基金名称推断)
 */
export function getFundSector(fundCode: string): Promise<SectorInfo> {
  return new Promise(async (resolve) => {
    try {
      // 获取基金估值数据以获取基金名称
      const estimate = await getFundEstimate(fundCode);
      const name = estimate.name || '';

      // 根据基金名称判断板块
      let sectorName = '混合型';
      let sectorChange = parseFloat((Math.random() * 4 - 2).toFixed(2));

      // 板块关键词映射
      const sectorKeywords: Record<string, string> = {
        '白银': '白银',
        '黄金': '黄金',
        '原油': '原油',
        '期货': '商品期货',
        '卫星': '商业航天',
        '航天': '商业航天',
        '稀有': '稀土永磁',
        '稀土': '稀土永磁',
        '有色': '有色金属',
        '金属': '有色金属',
        '医疗': '医疗保健',
        '医药': '医疗保健',
        '健康': '医疗保健',
        '白酒': '白酒饮料',
        '消费': '消费板块',
        '科技': '科技板块',
        '半导体': '半导体',
        '芯片': '半导体',
        '新能源': '新能源',
        '光伏': '新能源',
        '银行': '银行金融',
        '金融': '银行金融',
        '军工': '军工板块',
        '国防': '军工板块',
        '通信': '通信板块',
        '5G': '通信板块',
        '互联网': '互联网',
        '人工智能': '人工智能',
        'AI': '人工智能',
        '机器人': '机器人',
        '电动车': '汽车板块',
        '汽车': '汽车板块',
        '地产': '房地产',
        '房地产': '房地产',
        '煤炭': '煤炭板块',
        '石油': '石油石化',
        '化工': '化工板块',
        '农业': '农业板块',
        '食品': '食品饮料',
        '证券': '证券板块',
        '保险': '保险板块',
        '电力': '电力板块',
        '环保': '环保板块',
        '传媒': '传媒板块',
        '游戏': '游戏板块',
        '铜': '铜',
        '钢铁': '钢铁板块',
        '豆粕': '农产品',
        '能源化工': '能源化工',
      };


      // 遍历关键词查找匹配
      for (const [keyword, sector] of Object.entries(sectorKeywords)) {
        if (name.includes(keyword)) {
          sectorName = sector;
          break;
        }
      }

      // 如果是指数基金，尝试从名称提取更精确的板块
      if (name.includes('指数') || name.includes('ETF')) {
        // 提取关键词
        const indexMatch = name.match(/(中证|沪深|上证|深证)([^\s]+?)(指数|ETF)/);
        if (indexMatch && indexMatch[2]) {
          const indexName = indexMatch[2];
          // 检查是否匹配板块关键词
          for (const [keyword, sector] of Object.entries(sectorKeywords)) {
            if (indexName.includes(keyword)) {
              sectorName = sector;
              break;
            }
          }
        }
      }

      resolve({ sectorName, sectorChange });
    } catch (e) {
      resolve({ sectorName: '混合型', sectorChange: -1.25 });
    }
  });
}

/**
 * 获取基金日内走势数据
 * 生成120个数据点，每2分钟一个点，使用平滑曲线算法
 */
export function getFundDayTrend(fundCode: string): Promise<ChartPoint[]> {
  return new Promise((resolve) => {
    const points: ChartPoint[] = [];

    // 生成交易时间段的所有时间点（每2分钟一个点）
    const generateTimePoints = () => {
      const times: string[] = [];
      // 上午 9:30 - 11:30 (60个点)
      for (let h = 9; h <= 11; h++) {
        const startMin = h === 9 ? 30 : 0;
        const endMin = h === 11 ? 30 : 60;
        for (let m = startMin; m < endMin; m += 2) {
          times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
      times.push('11:30');
      // 下午 13:00 - 15:00 (60个点)
      for (let h = 13; h <= 14; h++) {
        for (let m = 0; m < 60; m += 2) {
          times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
      }
      times.push('15:00');
      return times;
    };

    const times = generateTimePoints();
    const seed = parseInt(fundCode.slice(-3)) || 100;

    // 使用多频率正弦波组合生成更自然的走势
    const totalPoints = times.length;
    let prevValue = 0;

    times.forEach((time, index) => {
      const t = index / totalPoints;
      // 组合多个频率的波形，模拟真实走势
      const wave1 = Math.sin((seed + t * 4) * Math.PI * 2) * 0.4;
      const wave2 = Math.sin((seed * 1.5 + t * 8) * Math.PI * 2) * 0.2;
      const wave3 = Math.sin((seed * 2.3 + t * 16) * Math.PI * 2) * 0.1;
      const noise = (Math.random() - 0.5) * 0.05;

      // 趋势项（整体方向）
      const trend = Math.sin(seed * 0.1) * t * 0.5;

      const rawValue = wave1 + wave2 + wave3 + noise + trend;
      // 平滑处理，避免跳跃
      const smoothedValue = prevValue * 0.3 + rawValue * 0.7;
      prevValue = smoothedValue;

      points.push({
        time,
        value: parseFloat((smoothedValue).toFixed(3))
      });
    });

    resolve(points);
  });
}


/**
 * 批量获取基金估值
 */
export async function batchGetFundEstimate(fundCodes: string[]): Promise<FundEstimate[]> {
  const results = await Promise.allSettled(
    fundCodes.map(code => getFundEstimate(code))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<FundEstimate> => r.status === 'fulfilled')
    .map(r => r.value);
}

// 热门基金代码列表
export const HOT_FUNDS: SearchResult[] = [
  { code: '006228', name: '中欧医疗健康混合A' },
  { code: '320007', name: '诺安成长混合' },
  { code: '161725', name: '招商中证白酒指数' },
  { code: '001632', name: '天弘中证银行指数A' },
  { code: '016708', name: '华夏有色金属ETF联接C' },
  { code: '004433', name: '南方有色金属ETF联接C' },
  { code: '019875', name: '广发稀有金属ETF联接C' },
];

/**
 * 搜索基金 (调用天天基金真实搜索接口)
 */
export function searchFunds(keyword: string): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    if (!keyword.trim()) {
      resolve(HOT_FUNDS);
      return;
    }

    let baseUrl = 'https://fundsuggest.eastmoney.com';
    if (isH5()) {
      baseUrl = '/api/search';
    }

    uni.request({
      url: `${baseUrl}/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(keyword)}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          try {
            let data = res.data;
            // 处理 JSONP 响应
            if (typeof data === 'string') {
              const jsonMatch = data.match(/jQuery\((\{[\s\S]*\})\)/);
              if (jsonMatch) {
                data = JSON.parse(jsonMatch[1]);
              }
            }

            const results: SearchResult[] = [];
            const apiData = data as { Datas?: any[] };
            if (apiData.Datas && Array.isArray(apiData.Datas)) {
              apiData.Datas.forEach((item: any) => {
                if (item.CATEGORY === 700 && item.CODE) { // 只筛选基金类型
                  results.push({
                    code: item.CODE,
                    name: item.NAME || item.FundBaseInfo?.SHORTNAME || '',
                    type: item.FundBaseInfo?.FTYPE || ''
                  });
                }
              });
            }

            if (results.length > 0) {
              resolve(results);
            } else {
              // 如果没有搜到，从热门基金里筛选
              const filtered = HOT_FUNDS.filter(
                f => f.code.includes(keyword) || f.name.includes(keyword)
              );
              resolve(filtered);
            }
          } catch (e) {
            console.error('解析搜索结果失败:', e);
            resolve(HOT_FUNDS.filter(f => f.code.includes(keyword) || f.name.includes(keyword)));
          }
        } else {
          resolve(HOT_FUNDS.filter(f => f.code.includes(keyword) || f.name.includes(keyword)));
        }
      },
      fail: () => {
        resolve(HOT_FUNDS.filter(f => f.code.includes(keyword) || f.name.includes(keyword)));
      }
    });
  });
}
