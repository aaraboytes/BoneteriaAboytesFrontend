import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';

/**
 * Utility class for generating .docx documents from templates.
 */
export class DocxGenerator {
  /**
   * Generates and downloads a .docx file from a template.
   * 
   * @param templateUrl URL to the .docx template file (usually in /public/templates/)
   * @param data Object containing the data to fill the template with
   * @param fileName The name of the file to download (without extension)
   */
  static async generateFromTemplate(templateUrl: string, data: Record<string, any>, fileName: string): Promise<void> {
    try {
      // 1. Fetch the template
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template from ${templateUrl}`);
      }
      const content = await response.arrayBuffer();

      // 2. Initialize PizZip and Docxtemplater
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 3. Set the data
      doc.setData(data);

      // 4. Render the document
      try {
        doc.render();
      } catch (error: any) {
        // The error object contains a lot of useful information for debugging
        console.error('Docxtemplater Error:', error);
        throw error;
      }

      // 5. Generate the output as a blob
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // 6. Trigger download
      saveAs(out, `${fileName}.docx`);
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }
}
