import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './routes/index.tsx';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#f8fafc',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </>
  );
}

export default App;
