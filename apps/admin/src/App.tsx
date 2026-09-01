import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { ManufacturingQueue } from './pages/ManufacturingQueue';
import { Notifications } from './pages/Notifications';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="manufacturing" element={<ManufacturingQueue />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
