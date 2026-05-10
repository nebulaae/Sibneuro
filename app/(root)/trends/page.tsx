import { Trends } from '@/components/pages/Trends';
import { Suspense } from 'react';

const TrendsPage = () => {
  return (
    <Suspense fallback={null}>
      <Trends />
    </Suspense>
  );
};

export default TrendsPage;
