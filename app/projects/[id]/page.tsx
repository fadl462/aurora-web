import { ProjectContent } from "@/components/projects/ProjectContent";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectContent projectId={id} />;
}
