import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

// Convert markdown-like text to plain text for Word/PDF
// Remove all markdown formatting to ensure clean, normal-weight text
const cleanText = (text) => {
  return text
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown (**text**)
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown (*text*)
    .replace(/`(.*?)`/g, '$1') // Remove code markdown
    .replace(/__(.*?)__/g, '$1') // Remove bold underscore markdown
    .replace(/_(.*?)_/g, '$1') // Remove italic underscore markdown
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
    // Split by all heading levels (##, ###, ####, etc.) while preserving the headings
    const sections = content.split(/(\n#{2,6}\s+[^\n]+)/);
    const docParagraphs = [];
    let sectionIndex = 0;

    sections.forEach((section) => {
      // Check if this is a heading (##, ###, ####, etc.)
      const headingMatch = section.match(/^(#{2,6})\s+(.+)/);
      if (headingMatch) {
        const headingLevel = headingMatch[1].length; // Number of # symbols
        const headingText = headingMatch[2].trim();
        
        // Determine HeadingLevel based on markdown level
        let headingLevelType;
        if (headingLevel === 2) {
          headingLevelType = HeadingLevel.HEADING_2;
        } else if (headingLevel === 3) {
          headingLevelType = HeadingLevel.HEADING_3;
        } else if (headingLevel === 4) {
          headingLevelType = HeadingLevel.HEADING_4;
        } else if (headingLevel === 5) {
          headingLevelType = HeadingLevel.HEADING_5;
        } else {
          headingLevelType = HeadingLevel.HEADING_6;
        }
        
        // All headings should be bold (handled by HeadingLevel styles)
        docParagraphs.push(
          new Paragraph({
            text: headingText,
            heading: headingLevelType,
            spacing: { after: 200, before: 200 },
          })
        );
      } else if (section.trim()) {
        // This is content - split by lines to handle subheadings within
        const lines = section.split(/\n/);
        
        lines.forEach((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          // Check if this line is a heading
          const lineHeadingMatch = trimmedLine.match(/^(#{2,6})\s+(.+)/);
          if (lineHeadingMatch) {
            const headingLevel = lineHeadingMatch[1].length;
            const headingText = lineHeadingMatch[2].trim();
            
            let headingLevelType;
            if (headingLevel === 2) {
              headingLevelType = HeadingLevel.HEADING_2;
            } else if (headingLevel === 3) {
              headingLevelType = HeadingLevel.HEADING_3;
            } else if (headingLevel === 4) {
              headingLevelType = HeadingLevel.HEADING_4;
            } else if (headingLevel === 5) {
              headingLevelType = HeadingLevel.HEADING_5;
            } else {
              headingLevelType = HeadingLevel.HEADING_6;
            }
            
            docParagraphs.push(
              new Paragraph({
                text: headingText,
                heading: headingLevelType,
                spacing: { after: 200, before: 200 },
              })
            );
          } else {
            // Regular content - ensure normal weight
            const cleaned = cleanText(trimmedLine);
            if (cleaned) {
              docParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cleaned,
                      size: 22,
                      bold: false, // Explicitly set body text to normal weight
                    }),
                  ],
                  spacing: { after: 200 },
                  alignment: AlignmentType.JUSTIFIED,
                })
              );
            }
          }
        });
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

    // Parse content with sections - handle all heading levels (##, ###, ####, etc.)
    const sections = content.split(/(\n#{2,6}\s+[^\n]+)/);

    sections.forEach((section) => {
      // Check if this is a heading (##, ###, ####, etc.)
      const headingMatch = section.match(/^(#{2,6})\s+(.+)/);
      if (headingMatch) {
        const headingLevel = headingMatch[1].length; // Number of # symbols
        const headingText = headingMatch[2].trim();
        
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Set font size based on heading level (smaller for deeper levels)
        if (headingLevel === 2) {
          pdf.setFontSize(16);
        } else if (headingLevel === 3) {
          pdf.setFontSize(14);
        } else if (headingLevel === 4) {
          pdf.setFontSize(13);
        } else {
          pdf.setFontSize(12);
        }
        
        // All headings should be bold
        pdf.setFont('helvetica', 'bold');
        const headingLines = pdf.splitTextToSize(headingText, maxWidth);
        pdf.text(headingLines, margin, yPosition);
        yPosition += headingLines.length * (headingLevel === 2 ? 8 : 7) + 10;
        
        // Reset to normal font for body text
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      } else if (section.trim()) {
        // Process content line by line to handle any embedded headings
        const lines = section.split(/\n/);
        
        lines.forEach((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          // Check if this line is a heading
          const lineHeadingMatch = trimmedLine.match(/^(#{2,6})\s+(.+)/);
          if (lineHeadingMatch) {
            const headingLevel = lineHeadingMatch[1].length;
            const headingText = lineHeadingMatch[2].trim();
            
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            
            // Set font size based on heading level
            if (headingLevel === 2) {
              pdf.setFontSize(16);
            } else if (headingLevel === 3) {
              pdf.setFontSize(14);
            } else if (headingLevel === 4) {
              pdf.setFontSize(13);
            } else {
              pdf.setFontSize(12);
            }
            
            // All headings should be bold
            pdf.setFont('helvetica', 'bold');
            const headingLines = pdf.splitTextToSize(headingText, maxWidth);
            pdf.text(headingLines, margin, yPosition);
            yPosition += headingLines.length * (headingLevel === 2 ? 8 : 7) + 10;
            
            // Reset to normal font
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
          } else {
            // Regular content - ensure it's always normal weight
            const cleaned = cleanText(trimmedLine);
            if (cleaned) {
              // Explicitly set to normal font before rendering body text
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(12);
              
              const textLines = pdf.splitTextToSize(cleaned, maxWidth);
              
              textLines.forEach((textLine) => {
                if (yPosition > pageHeight - 20) {
                  pdf.addPage();
                  yPosition = margin;
                }
                pdf.text(textLine, margin, yPosition);
                yPosition += 7;
              });
              
              yPosition += 5; // Space between paragraphs
            }
          }
        });
      }
    });

    pdf.save(`${topic.replace(/[^a-z0-9]/gi, '_')}_blog.pdf`);
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to create PDF document');
  }
};

