import { Routes, Route, Navigate } from 'react-router-dom';
import ParentsPage from './ParentsPage';
import ParentDetailsPage from './ParentDetailsPage';
import ParentCreatePage from './ParentCreatePage';
import ParentEditPage from './ParentEditPage';

export default function ParentsRoutes() {
  return (
    <Routes>
      <Route index element={<ParentsPage />} />
      <Route path="new" element={<ParentCreatePage />} />
      <Route path=":id/edit" element={<ParentEditPage />} />
      <Route path=":id" element={<ParentDetailsPage />} />
      <Route path="*" element={<Navigate to="/parents" replace />} />
    </Routes>
  );
}
