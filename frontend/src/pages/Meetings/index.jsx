import { Routes, Route, Navigate } from 'react-router-dom';
import MeetingsPage from './MeetingsPage';
import MeetingDetail from './MeetingDetail';
import MeetingRoom from './MeetingRoom';
import ScheduleMeeting from './ScheduleMeeting';

export default function MeetingsRoutes() {
  return (
    <Routes>
      <Route index element={<MeetingsPage />} />
      <Route path="schedule" element={<ScheduleMeeting />} />
      <Route path=":id" element={<MeetingDetail />} />
      <Route path=":id/room" element={<MeetingRoom />} />
      <Route path="*" element={<Navigate to="/meetings" replace />} />
    </Routes>
  );
}
