export default function KPICards({
  dashboard
}) {

  return (
    <div className="kpi-grid">

      <div className="kpi-card sales">
        <h4>Total Sales</h4>
        <h1>
          $
          {Number(
            dashboard.totalSales || 0
          ).toLocaleString()}
        </h1>
      </div>

      <div className="kpi-card cost">
        <h4>Total Cost</h4>
        <h1>
          $
          {Number(
            dashboard.totalCost || 0
          ).toLocaleString()}
        </h1>
      </div>

      <div className="kpi-card profit">
        <h4>Total Profit</h4>
        <h1>
          $
          {Number(
            dashboard.totalProfit || 0
          ).toLocaleString()}
        </h1>
      </div>

      <div className="kpi-card orders">
        <h4>Total Orders</h4>
        <h1>
          {dashboard.totalOrders}
        </h1>
      </div>

    </div>
  );
}