import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

export async function extractResumeText(file: File) {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push((content.items as Array<{ str?: string }>).map((item) => item.str || "").join(" "));
    }

    return pages.join("\n\n");
  }

  if (file.name.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  return file.text();
}

function sectionText(text: string, names: string[]) {
  const heading = names.join("|");
  return text.match(new RegExp(`(?:^|\\n)\\s*(?:${heading})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:experience|work history|employment|education|skills|technical skills|technologies|summary|profile|objective|projects?)\\b|$)`, "i"))?.[1]?.trim() || "";
}

export function buildResumeContent(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const skillsText = sectionText(text, ["skills", "technical skills", "technologies"]);
  const projectText = sectionText(text, ["projects", "personal projects", "academic projects"]);
  const experienceText = sectionText(text, ["experience", "work history", "employment"]);
  const summary = sectionText(text, ["summary", "profile", "objective"]);

  const skills = skillsText
    .split(/[,|•·\n]/)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 1 && skill.length < 60)
    .slice(0, 30);
  const projectLines = projectText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const experienceLines = experienceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return {
    personalDetails: { name: lines[0] || "", email: "", phone: "", location: "" },
    summary,
    skills,
    projects: projectLines.length
      ? [{ name: projectLines[0], description: projectLines.slice(1).join("\n"), technologies: skills.join(", "), url: "" }]
      : [],
    experience: experienceLines.length
      ? [{
        jobTitle: experienceLines[0] || "",
        company: experienceLines[1] || "",
        location: "",
        startDate: "",
        endDate: "",
        description: experienceLines.slice(2).join("\n"),
      }]
      : [],
    education: [],
    extractedText: text.slice(0, 500_000),
  };
}