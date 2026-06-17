import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import KPICards from "../components/KPICards";

import SalesHourChart from "../components/SalesHourChart";
import LocationChart from "../components/LocationChart";
import ProductChart from "../components/ProductChart";
import PaymentChart from "../components/PaymentChart";

import api from "../services/api";

export default function Dashboard() {

  const [dashboard, setDashboard] =
    useState({});

  const [timeData, setTimeData] =
    useState([]);

  const [locationData, setLocationData] =
    useState([]);

  const [productData, setProductData] =
    useState([]);

  const [paymentData, setPaymentData] =
    useState([]);

  useEffect(() => {

    api.get("/dashboard")
      .then(res =>
        setDashboard(res.data)
      );

    api.get("/time-analysis")
      .then(res =>
        setTimeData(res.data)
      );

    api.get("/location-analysis")
      .then(res =>
        setLocationData(res.data)
      );

    api.get("/product-analysis")
      .then(res =>
        setProductData(res.data)
      );

    api.get("/payment-analysis")
      .then(res =>
        setPaymentData(res.data)
      );

  }, []);

  return (
    <div className="layout">

      <Sidebar />

      <div className="main">

        <Header />

        <KPICards
          dashboard={dashboard}
        />

        <div className="chart-grid">

          <SalesHourChart
            data={timeData}
          />

          <PaymentChart
            data={paymentData}
          />

          <LocationChart
            data={locationData}
          />

          <ProductChart
            data={productData}
          />

        </div>

      </div>

    </div>
  );
}