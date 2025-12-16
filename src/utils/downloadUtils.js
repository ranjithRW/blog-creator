import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

// Convert markdown-like text to plain text for Word/PDF
const cleanText = (text) => {
  return text
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .trim();
};

// Split text into paragraphs
const splitIntoParagraphs = (text) => {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
};

// Check if a paragraph is a heading (starts with # or is short and bold-like)
const isHeading = (text) => {
  const cleaned = text.trim();
  return cleaned.startsWith('#') || (cleaned.length < 100 && cleaned.split(' ').length < 15);
};

export const downloadAsWord = async (content, topic) => {
  try {
    const paragraphs = splitIntoParagraphs(content);
    const docParagraphs = [];

    paragraphs.forEach((para) => {
      const cleaned = cleanText(para);
      if (isHeading(para)) {
        // It's a heading
        const headingText = cleaned.replace(/^#+\s*/, '');
        docParagraphs.push(
          new Paragraph({
            text: headingText,
            heading: para.startsWith('##') ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
            spacing: { after: 200, before: 200 },
          })
        );
      } else {
        // Regular paragraph
        const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const runs = sentences.map((sentence, index) => {
          return new TextRun({
            text: sentence.trim() + (index < sentences.length - 1 ? '. ' : ''),
            size: 22,
          });
        });

        docParagraphs.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: topic,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            ...docParagraphs,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${topic.replace(/[^a-z0-9]/gi, '_')}_blog.docx`);
  } catch (error) {
    console.error('Error creating Word document:', error);
    throw new Error('Failed to create Word document');
  }
};

export const downloadAsPDF = async (content, topic) => {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(topic, maxWidth);
    pdf.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 10 + 10;

    // Add content
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const paragraphs = splitIntoParagraphs(content);

    paragraphs.forEach((para) => {
      const cleaned = cleanText(para);
      
      if (isHeading(para)) {
        // Heading
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const headingText = cleaned.replace(/^#+\s*/, '');
        const headingLines = pdf.splitTextToSize(headingText, maxWidth);
        pdf.text(headingLines, margin, yPosition);
        yPosition += headingLines.length * 8 + 5;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      } else {
        // Regular paragraph
        const lines = pdf.splitTextToSize(cleaned, maxWidth);
        
        lines.forEach((line) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 7;
        });
        
        yPosition += 5; // Space between paragraphs
      }
    });

    pdf.save(`${topic.replace(/[^a-z0-9]/gi, '_')}_blog.pdf`);
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to create PDF document');
  }
};

