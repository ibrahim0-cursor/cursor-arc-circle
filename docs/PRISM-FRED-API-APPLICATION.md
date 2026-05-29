# FRED API key application — copy/paste text

Use this in the St. Louis Fed FRED API signup form under **“Describe the application or program you intend to write.”**

---

**Application description (paste as-is):**

MERIDIAN PRISM is a macro and geopolitical forecasting module inside a web application built for the ARC Circle hackathon (Arc blockchain testnet). The app lets users select macro events—such as Federal Reserve rate decisions, US CPI releases, and oil price thresholds—and generates calibrated probability forecasts with explainable reasoning.

PRISM uses the FRED API to pull official US economic time series (for example: effective federal funds rate, CPI, and WTI crude oil) and combines those observations with live crypto market data (Binance, CoinGecko), DeFi total value locked (DefiLlama), and news/intelligence feeds. FRED series are used only to ground forecasts in published government statistics: latest values, recent changes, and trend context fed into our forecasting agent. Data is requested on-demand when a user runs a forecast or loads the PRISM dashboard, cached briefly on the server, and not resold or republished as a standalone data product.

The application is a read-only research and decision-support tool for traders and builders; it does not automate trades based on FRED data alone. We will attribute FRED as the source in product documentation and respect FRED terms, rate limits, and series revision policies.

---

After you receive `FRED_API_KEY`, add it to Vercel (Production) and `.env.local`, then redeploy:

```powershell
# .env.local
FRED_API_KEY=your_key_here

powershell -File scripts/sync-prism-keys-vercel.ps1
npx vercel --prod --yes
```
