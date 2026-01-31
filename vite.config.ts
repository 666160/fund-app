import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      // 基金估值接口代理 (fundgz.1234567.com.cn)
      '/api/fund': {
        target: 'https://fundgz.1234567.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fund/, '/js')
      },
      // 基金详情数据接口代理 (fund.eastmoney.com)
      '/api/funddata': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/funddata/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 设置更完整的请求头
            proxyReq.setHeader('Referer', 'https://fund.eastmoney.com/');
            proxyReq.setHeader('Origin', 'https://fund.eastmoney.com');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      },
      // 基金搜索接口代理 (fundsuggest.eastmoney.com)
      '/api/search': {
        target: 'https://fundsuggest.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '')
      },
      // 股票实时行情接口代理 (push2.eastmoney.com)
      '/api/stock': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/stock/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Referer', 'https://quote.eastmoney.com/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      }
    }
  }
});
