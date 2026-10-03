import { Routes, Route } from 'react-router-dom';
import GroupsPage from './GroupsPage';
import GroupDetails from './GroupDetails';
import CreateGroup from './CreateGroup';

export default function GroupsRoutes() {
  return (
    <Routes>
      <Route index element={<GroupsPage />} />
      <Route path="create" element={<CreateGroup />} />
      <Route path=":id" element={<GroupDetails />} />
    </Routes>
  );
}
