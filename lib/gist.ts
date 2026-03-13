type TemplateContext = {
  projectName: string;
  location: string;
  category: string;
  sector: string;
  description: string;
  sectorNotes: string;
};

export function renderGistTemplate(
  template: string,
  context: TemplateContext
): string {
  return template
    .replaceAll("{{projectName}}", context.projectName)
    .replaceAll("{{location}}", context.location)
    .replaceAll("{{category}}", context.category)
    .replaceAll("{{sector}}", context.sector)
    .replaceAll("{{description}}", context.description)
    .replaceAll("{{sectorNotes}}", context.sectorNotes);
}

export function defaultTemplateForCategory(category: string): string {
  return [
    "Meeting Gist",
    "",
    "Project: {{projectName}}",
    "Location: {{location}}",
    `Category: ${category}`,
    "Sector: {{sector}}",
    "",
    "Project Overview:",
    "{{description}}",
    "",
    "Sector-Specific Considerations:",
    "{{sectorNotes}}",
  ].join("\n");
}
