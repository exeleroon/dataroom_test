import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { MainLayout } from '@/components/layout/MainLayout'
import { DataroomsPage } from '@/pages/dataRoom/DataroomsPage'
import { DataroomPage } from '@/pages/dataRoom/DataroomPage'
import { NotFoundPage } from '@/pages/dataRoom/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DataroomsPage />} />
          <Route path="/d/:dataroomId" element={<DataroomPage />} />
          <Route path="/d/:dataroomId/f/:folderId" element={<DataroomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
