import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exam } = body;
    const config = exam.config || {};
    const questions = exam.questions || [];
    const title = exam.title || "Đề thi";

    const mcqQuestions = questions.filter((q: any) => q.type === "Trắc nghiệm");
    const essayQuestions = questions.filter((q: any) => q.type === "Tự luận");

    // Helper functions for easy formatting
    const createHeaderCell = (lines: any[], alignment = AlignmentType.CENTER) => {
      return new TableCell({
        children: lines.map(line => new Paragraph({
          alignment,
          children: [new TextRun({ text: line.text, font: "Times New Roman", size: line.size || 24, bold: line.bold || false })]
        }))
      });
    };

    const docSections: any[] = [];

    // Header Table
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            createHeaderCell([
              { text: config.schoolName || "SỞ GIÁO DỤC VÀ ĐÀO TẠO", size: 24 },
              { text: "ĐỀ THI THAM KHẢO", size: 24, bold: true },
            ]),
            createHeaderCell([
              { text: `KỲ THI: ${title.toUpperCase()}`, size: 24, bold: true },
              { text: `Môn: ${config.subject || ""}  —  Năm học: ${config.schoolYear || "2026 - 2027"}`, size: 24 },
              { text: `Thời gian làm bài: ${config.duration || 90} phút`, size: 24 },
            ]),
          ],
        }),
      ],
    });
    
    docSections.push(headerTable);
    docSections.push(new Paragraph({ text: "" })); // Spacer

    // I. Trắc nghiệm
    if (mcqQuestions.length > 0) {
      const mcqPts = mcqQuestions.reduce((sum: number, q: any) => sum + (q.points || 0.25), 0);
      docSections.push(new Paragraph({
        children: [new TextRun({ text: `PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (${mcqPts.toFixed(1)} điểm)`, font: "Times New Roman", size: 24, bold: true })]
      }));

      mcqQuestions.forEach((q: any, i: number) => {
        docSections.push(new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}: `, font: "Times New Roman", size: 24, bold: true }),
            new TextRun({ text: q.content, font: "Times New Roman", size: 24 }),
          ]
        }));
        
        if (q.options && q.options.length > 0) {
          const optsText = q.options.map((o: any) => `${o.key}. ${o.text}`).join("          ");
          docSections.push(new Paragraph({
            children: [new TextRun({ text: optsText, font: "Times New Roman", size: 24 })]
          }));
        }
      });
      docSections.push(new Paragraph({ text: "" }));
    }

    // II. Tự luận
    if (essayQuestions.length > 0) {
      const essayPts = essayQuestions.reduce((sum: number, q: any) => sum + (q.points || 2.0), 0);
      docSections.push(new Paragraph({
        children: [new TextRun({ text: `PHẦN II. TỰ LUẬN (${essayPts.toFixed(1)} điểm)`, font: "Times New Roman", size: 24, bold: true })]
      }));

      essayQuestions.forEach((q: any, i: number) => {
        const pts = q.points || 2.0;
        docSections.push(new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1} (${pts.toFixed(1)} điểm): `, font: "Times New Roman", size: 24, bold: true }),
            new TextRun({ text: q.content, font: "Times New Roman", size: 24 }),
          ]
        }));
        docSections.push(new Paragraph({ text: "" }));
      });
    }

    // --- Page Break & Answer Key ---
    docSections.push(new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN", font: "Times New Roman", size: 28, bold: true })]
    }));

    if (mcqQuestions.length > 0) {
      docSections.push(new Paragraph({ children: [new TextRun({ text: "I. TRẮC NGHIỆM", font: "Times New Roman", size: 24, bold: true })] }));
      
      const hdrCells = [new TableCell({ children: [new Paragraph({ text: "Câu", alignment: AlignmentType.CENTER })] })];
      const ansCells = [new TableCell({ children: [new Paragraph({ text: "Đáp án", alignment: AlignmentType.CENTER })] })];

      mcqQuestions.forEach((q: any, i: number) => {
        hdrCells.push(new TableCell({ children: [new Paragraph({ text: `${i + 1}`, alignment: AlignmentType.CENTER })] }));
        ansCells.push(new TableCell({ children: [new Paragraph({ text: q.answer, alignment: AlignmentType.CENTER })] }));
      });

      docSections.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: hdrCells }),
          new TableRow({ children: ansCells })
        ]
      }));
      docSections.push(new Paragraph({ text: "" }));
    }

    if (essayQuestions.length > 0) {
      docSections.push(new Paragraph({ children: [new TextRun({ text: "II. TỰ LUẬN", font: "Times New Roman", size: 24, bold: true })] }));
      essayQuestions.forEach((q: any, i: number) => {
        docSections.push(new Paragraph({ children: [new TextRun({ text: `Câu ${i + 1}: `, font: "Times New Roman", size: 24, bold: true })] }));
        docSections.push(new Paragraph({ children: [new TextRun({ text: q.explanation || q.answer, font: "Times New Roman", size: 24 })] }));
      });
    }

    // Build the Document
    const doc = new Document({
      sections: [{ properties: {}, children: docSections }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Export_${exam.id}.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Failed to generate Word document" }, { status: 500 });
  }
}
