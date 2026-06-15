const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } = require('docx');

async function createDoc() {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Header
                    new Table({
                        width: {
                            size: 100,
                            type: WidthType.PERCENTAGE,
                        },
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
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "SỞ GIÁO DỤC VÀ ĐÀO TẠO", font: "Times New Roman", size: 24 }),
                                                ]
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "TP. CẦN THƠ", font: "Times New Roman", size: 24 }),
                                                ]
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "ĐỀ THI THAM KHẢO", font: "Times New Roman", size: 24, bold: true }),
                                                ]
                                            }),
                                        ],
                                    }),
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "KỲ THI TUYỂN SINH LỚP 10 THPT", font: "Times New Roman", size: 24, bold: true }),
                                                ]
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "NĂM HỌC 2026 - 2027", font: "Times New Roman", size: 24, bold: true }),
                                                ]
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "Môn thi: TOÁN", font: "Times New Roman", size: 24 }),
                                                ]
                                            }),
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ text: "Thời gian làm bài: 120 phút", font: "Times New Roman", size: 24 }),
                                                ]
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    new Paragraph({ text: "" }), // Spacer

                    // Phần I: Trắc nghiệm khách quan
                    new Paragraph({
                        children: [
                            new TextRun({ text: "PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (3.0 điểm)", font: "Times New Roman", size: 24, bold: true })
                        ]
                    }),

                    // Câu 1
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Câu 1: ", font: "Times New Roman", size: 24, bold: true }),
                            new TextRun({ text: "Biểu thức √(x-2) xác định khi và chỉ khi:", font: "Times New Roman", size: 24 }),
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "A. x > 2               B. x ≥ 2               C. x < 2               D. x ≤ 2", font: "Times New Roman", size: 24 }),
                        ]
                    }),

                    // Câu 2
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Câu 2: ", font: "Times New Roman", size: 24, bold: true }),
                            new TextRun({ text: "Hàm số y = (m-1)x + 3 đồng biến trên R khi:", font: "Times New Roman", size: 24 }),
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "A. m > 1               B. m < 1               C. m ≥ 1               D. m ≠ 1", font: "Times New Roman", size: 24 }),
                        ]
                    }),

                    new Paragraph({ text: "" }),

                    // Phần II: Tự luận
                    new Paragraph({
                        children: [
                            new TextRun({ text: "PHẦN II. TỰ LUẬN (7.0 điểm)", font: "Times New Roman", size: 24, bold: true })
                        ]
                    }),

                    // Câu 1 Tự luận
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Câu 1 (2.0 điểm): ", font: "Times New Roman", size: 24, bold: true }),
                            new TextRun({ text: "Giải hệ phương trình sau:\n", font: "Times New Roman", size: 24 }),
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "   (1) 2x + y = 5\n   (2) x - 3y = -1", font: "Times New Roman", size: 24 }),
                        ]
                    }),
                    
                    new Paragraph({
                        pageBreakBefore: true,
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN", font: "Times New Roman", size: 28, bold: true }),
                        ]
                    }),
                    
                    new Paragraph({
                        children: [
                            new TextRun({ text: "I. TRẮC NGHIỆM", font: "Times New Roman", size: 24, bold: true }),
                        ]
                    }),
                    
                    new Table({
                        width: {
                            size: 100,
                            type: WidthType.PERCENTAGE,
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: "Câu", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "1", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "2", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "3", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "...", alignment: AlignmentType.CENTER })] }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ text: "Đáp án", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "B", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "A", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "...", alignment: AlignmentType.CENTER })] }),
                                    new TableCell({ children: [new Paragraph({ text: "...", alignment: AlignmentType.CENTER })] }),
                                ],
                            }),
                        ],
                    })
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("Mau_De_Thi_Toan.docx", buffer);
    console.log("File Mau_De_Thi_Toan.docx created successfully!");
}

createDoc().catch(console.error);
