import { ExcalidrawEditor } from "@/components/editor/ExcalidrawEditor";

export const dynamic = "force-dynamic";

export default function BoardPage({ params }: { params: { id: string } }) {
  return <ExcalidrawEditor boardId={params.id} />;
}
