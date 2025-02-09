import { Suspense } from 'react';
import EvalDetail from './EvalDetail';

interface PageProps {
  params: Promise<{
    uuid: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EvalDetail uuid={resolvedParams.uuid} />
    </Suspense>
  );
} 