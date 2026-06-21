import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import KPICards from '../components/KPICards';
import SalesHourChart from '../components/SalesHourChart';
import LocationChart from '../components/LocationChart';
import ProductChart from '../components/ProductChart';
import PaymentChart from '../components/PaymentChart';
import api from '../services/api';

export default function Dashboard() {
  const [cards,   setCards]   = useState({});
  const [charts,  setCharts]  = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get('/dashboard')
      .then(res => {
        setCards(res.data.cards);
        setCharts(res.data.charts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onRefresh={fetchData} loading={loading} />

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">
          {loading && !cards.totalSales ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading dashboard…</span>
              </div>
            </div>
          ) : (
            <>
              <KPICards dashboard={cards} />

              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Analytics Overview
                </h3>
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 min-h-0">
                  <SalesHourChart data={charts.hourlyTrends}        />
                  <PaymentChart   data={charts.paymentDistribution} />
                  <LocationChart  data={charts.regionalPerformance} />
                  <ProductChart   data={charts.categoryBreakdown}   />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
