import TabNavigation from './components/TabNavigation';
import { Footer, Header } from './components/common';
import './App.css';

function App() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleInfo = () => {
    alert('SAN Fabric Path Validator v1.0\n\nValidate host paths during SAN switch system upgrades with automated analysis and comprehensive reporting.');
  };

  const handleGuidelines = () => {
    alert('Guidelines:\n\n1. Upload Excel file with fabric data\n2. Ensure columns: Fabric, Alias, Member WWN, Logged In\n3. Valid configurations:\n   - AIX: 2 logged in + 2 not logged in per fabric\n   - ESXi/RHEL: 1 logged in per fabric\n4. Download validation report');
  };

  return (
    <div className="app">
      <Header
        onRefresh={handleRefresh}
        onInfo={handleInfo}
        onGuidelines={handleGuidelines}
      />
      <TabNavigation />
      <Footer />
    </div>
  );
}

export default App;
