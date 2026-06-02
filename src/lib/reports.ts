import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AppStats, SubmoduleStats, Category } from "@/lib/store";

export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ReportTemplate = "ringkas" | "enterprise";

export interface ReportInput {
  projectTitle: string;
  env: string;
  stats: AppStats;
  categories: Category[];
  submoduleStats: Record<string, SubmoduleStats>;
}

function passRate(s: { passed: number; totalTC: number }) {
  return s.totalTC > 0 ? (s.passed / s.totalTC) * 100 : 0;
}

function buildRows(input: ReportInput, template: ReportTemplate) {
  const rows: (string | number)[][] = [];
  if (template === "ringkas") {
    rows.push(["Submodule", "Passed", "Failed", "Total"]);
    for (const cat of input.categories) {
      for (const sub of cat.submodules) {
        const s = input.submoduleStats[sub.id];
        if (!s) continue;
        rows.push([sub.name, s.passed, s.failed, s.totalTC]);
      }
    }
  } else {
    rows.push(["Category", "Submodule", "Total", "Passed", "Failed", "Pending", "Pass Rate %", "Regression TC"]);
    for (const cat of input.categories) {
      for (const sub of cat.submodules) {
        const s = input.submoduleStats[sub.id];
        if (!s) continue;
        rows.push([
          cat.name,
          sub.name,
          s.totalTC,
          s.passed,
          s.failed,
          s.pending,
          passRate(s).toFixed(1),
          s.classification?.regression ?? 0,
        ]);
      }
    }
  }
  return rows;
}

function summary(input: ReportInput) {
  const pr = passRate(input.stats);
  return [
    ["Project", input.projectTitle],
    ["Environment", input.env],
    ["Generated At", new Date().toLocaleString("id-ID")],
    ["Total Test Cases", input.stats.totalTC],
    ["Passed", input.stats.passed],
    ["Failed", input.stats.failed],
    ["Pending", input.stats.pending],
    ["Pass Rate", pr.toFixed(1) + "%"],
  ];
}

function download(name: string, blob: Blob) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}

function escCsv(v: any) {
  return `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export function generateReport(input: ReportInput, format: ReportFormat, template: ReportTemplate) {
  const date = new Date().toISOString().slice(0, 10);
  const base = `qa-${template}-${input.env}-${date}`;
  const sum = summary(input);
  const rows = buildRows(input, template);

  if (format === "csv") {
    const lines = [
      `HMS QA HUB - ${template === "ringkas" ? "Ringkas" : "Enterprise"} Report`,
      ...sum.map((r) => r.map(escCsv).join(",")),
      "",
      ...rows.map((r) => r.map(escCsv).join(",")),
    ];
    download(base + ".csv", new Blob([lines.join("\n")], { type: "text/csv" }));
    return;
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const sumSheet = XLSX.utils.aoa_to_sheet([["HMS QA HUB - Summary"], [], ...sum]);
    XLSX.utils.book_append_sheet(wb, sumSheet, "Summary");
    const detail = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, detail, template === "ringkas" ? "Ringkas" : "Detail");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    download(base + ".xlsx", new Blob([wbout], { type: "application/octet-stream" }));
    return;
  }

  // PDF
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(`HMS QA HUB - ${template === "ringkas" ? "Ringkas" : "Enterprise"} Report`, 40, 40);
  doc.setFontSize(10);
  doc.text(`${input.projectTitle} · ${input.env}`, 40, 58);

  autoTable(doc, {
    startY: 80,
    head: [["Metric", "Value"]],
    body: sum.map((r) => r.map(String)),
    theme: "striped",
    headStyles: { fillColor: [6, 78, 59] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [rows[0].map(String)],
    body: rows.slice(1).map((r) => r.map(String)),
    theme: "grid",
    headStyles: { fillColor: [6, 78, 59] },
    styles: { fontSize: 8 },
  });

  if (template === "enterprise") {
    doc.setFontSize(8);
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Generated ${new Date().toLocaleString("id-ID")} · Page ${i}/${pageCount} · Developed by Suryani Lestari`,
        40,
        doc.internal.pageSize.getHeight() - 20
      );
    }
  }

  doc.save(base + ".pdf");
}
