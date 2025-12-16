import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, ExternalHyperlink, WidthType } from 'docx';
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

// Helper function to fetch image as blob
const fetchImageAsBlob = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

export const downloadAsWord = async (content, topic, images = []) => {
  try {
    const sections = content.split(/(\n##\s+[^\n]+)/);
    const docParagraphs = [];
    let sectionIndex = 0;

    sections.forEach((section) => {
      if (section.match(/^##\s+/)) {
        // This is a heading
        const headingText = section.replace(/^##\s+/, '').trim();
        
        // Check if there's an image for this section
        const image = images.find(img => img.sectionIndex === sectionIndex);
        sectionIndex++;
        
        if (image) {
          docParagraphs.push(
            new Paragraph({
              text: headingText,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200, before: 200 },
            })
          );
        } else {
          docParagraphs.push(
            new Paragraph({
              text: headingText,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200, before: 200 },
            })
          );
        }
      } else if (section.trim()) {
        // This is content
        const cleaned = cleanText(section);
        if (cleaned) {
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
      }
    });

    // Add images after their corresponding sections
    // Note: docx library requires images to be added separately
    // For now, we'll add image placeholders with links
    const finalParagraphs = [...docParagraphs];
    
    // Insert images after headings (simplified approach)
    images.forEach((image, idx) => {
      const insertIndex = (image.sectionIndex * 2) + 1;
      if (insertIndex < finalParagraphs.length) {
        // Add image reference as hyperlink (docx image embedding is complex)
        finalParagraphs.splice(insertIndex, 0, 
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: `[Image: ${image.description}]`,
                    style: "Hyperlink",
                  }),
                ],
                link: image.url,
              }),
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.CENTER,
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
            ...finalParagraphs,
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

export const downloadAsPDF = async (content, topic, images = []) => {
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

    // Parse content with sections
    const sections = content.split(/(\n##\s+[^\n]+)/);
    let sectionIndex = 0;

    sections.forEach((section) => {
      if (section.match(/^##\s+/)) {
        // This is a heading
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const headingText = section.replace(/^##\s+/, '').trim();
        const headingLines = pdf.splitTextToSize(headingText, maxWidth);
        pdf.text(headingLines, margin, yPosition);
        yPosition += headingLines.length * 8 + 10;
        
        // Check if there's an image for this section
        const image = images.find(img => img.sectionIndex === sectionIndex);
        sectionIndex++;
        
        if (image) {
          try {
            // Add image to PDF
            const imgWidth = maxWidth;
            const imgHeight = (imgWidth * 0.75); // Maintain aspect ratio
            
            if (yPosition + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.addImage(image.url, 'JPEG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          } catch (error) {
            console.error('Error adding image to PDF:', error);
            // Continue without image if it fails
          }
        }
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      } else if (section.trim()) {
        // Regular content
        const cleaned = cleanText(section);
        if (cleaned) {
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
      }
    });

    pdf.save(`${topic.replace(/[^a-z0-9]/gi, '_')}_blog.pdf`);
  } catch (error) {
    console.error('Error creating PDF:', error);
    throw new Error('Failed to create PDF document');
  }
};

