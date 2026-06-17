import {
  FaChartBar,
  FaMapMarkerAlt,
  FaBox,
  FaClock
} from "react-icons/fa";

export default function Sidebar() {
  return (
    <div className="sidebar">

      <h2>Sundery BI</h2>

      <ul>

        <li>
          <FaChartBar /> Dashboard
        </li>

        <li>
          <FaClock /> Time Analysis
        </li>

        <li>
          <FaMapMarkerAlt /> Location Analysis
        </li>

        <li>
          <FaBox /> Product Analysis
        </li>

      </ul>

    </div>
  );
}