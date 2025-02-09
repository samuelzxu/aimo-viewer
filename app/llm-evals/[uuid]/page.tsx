import EvalDetail from './EvalDetail';

export default function Page({ params }: { params: { uuid: string } }) {
  return <EvalDetail uuid={params.uuid} />;
} 