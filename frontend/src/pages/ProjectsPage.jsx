import React from 'react';
import { Empty, ProjectCard } from '../components/UI.jsx';

export default function ProjectsPage({ projects, query, onOpenProject, onDeleteProject }) {
  const filtered = projects.filter(project => `${project.name} ${project.location || ''} ${project.client || ''}`.toLowerCase().includes(query.toLowerCase()));
  const active = filtered.filter(project => project.status !== 'Completed');
  const completed = filtered.filter(project => project.status === 'Completed');
  return <div className="project-sections"><section className="project-section"><div className="project-section-head"><div><b>Active projects</b><span>{active.length} projects</span></div></div><div className="records-grid">{active.map(project => <ProjectCard key={project._id || project.id} project={project} onClick={() => onOpenProject(project)}/>)}{active.length === 0 && <Empty title={query ? 'No matching active projects' : 'No active projects'} detail="Projects not marked completed appear here."/>}</div></section><section className="project-section completed-project-section"><div className="project-section-head"><div><b>Completed projects</b><span>{completed.length} projects</span></div></div><div className="records-grid">{completed.map(project => <ProjectCard key={project._id || project.id} project={project} onClick={() => onOpenProject(project)} onDelete={onDeleteProject}/>)}{completed.length === 0 && <Empty title={query ? 'No matching completed projects' : 'No completed projects yet'} detail="Edit a project and mark it Completed to move it here."/>}</div></section>{filtered.length === 0 && <Empty title="No projects found" detail="Create a project or change your search."/>}</div>;
}
