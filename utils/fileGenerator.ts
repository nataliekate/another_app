// src/utils/fileGenerator.ts

import path from 'path';
import fs from 'fs/promises'; // Use fs.promises for async file operations
import os from 'os'; // For temporary directory
import archiver from 'archiver'; // Import archiver
import { PassThrough } from 'stream'; // To capture archive output in memory

// Define the template file names relative to the 'templates' directory
const TEMPLATE_FILE_NAMES = [
  'file1.txt',
  'file2.txt',
  'file3.txt',
];

interface ConfigDataInput {
  data: string;
  filename?: string; // filename is now an optional part of the input
}

/**
 * Generates and zips files by replacing a placeholder with provided data.
 * The resulting zip file content is returned as a Buffer.
 *
 * @param configData The object containing 'data' for replacement and optional 'filename' for the zip.
 * @returns A Promise that resolves with an object containing the generated zip file as a Buffer
 * and the determined filename, or rejects on error.
 */
export async function generateAndZipFiles(configData: ConfigDataInput): Promise<{ zipBuffer: Buffer; zipfilename: string }> {
  let tempDir: string | undefined; // Declare tempDir to ensure cleanup

  try {
    // Determine the absolute path to the templates directory
    const templatesDirPath = path.join(__dirname, '..', 'templates');

    // 1. Create a temporary directory for modified files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-files-'));
    console.log(`Created temporary directory: ${tempDir}`);

    const modifiedFilePaths: string[] = [];

    // 2. Read, modify, and write each template file to the temporary directory
    const desiredFilename = configData.filename; // Use filename from configData
    let prefix: string;
    if (typeof desiredFilename === 'string' && desiredFilename.trim().length > 0) {
      prefix = `${desiredFilename.replace(/[^a-zA-Z0-9-_.]/g, '')}`;

      for (const fileName of TEMPLATE_FILE_NAMES) {
        const templatePath = path.join(templatesDirPath, fileName);
        const modifiedContent = (await fs.readFile(templatePath, 'utf8'))
          .replace(/<replace_with_input>/g, configData.data); // Use global replace with configData.data

        const tempFilePath = path.join(tempDir, `${prefix}-${fileName}`);
        await fs.writeFile(tempFilePath, modifiedContent, 'utf8');
        modifiedFilePaths.push(tempFilePath);
        console.log(`Modified and saved: ${tempFilePath}`);
      }
    } else { }
    // 3. Setup Archiver for zipping
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    // Create a PassThrough stream to capture the archive output
    const outputStream = new PassThrough();
    archive.pipe(outputStream);

    // 4. Append modified files to the archive
    for (const filePath of modifiedFilePaths) {
      const fileNameInZip = path.basename(filePath); // Get original file name for zip entry
      archive.file(filePath, { name: fileNameInZip });
    }

    // 5. Finalize the archive (triggers the zipping process)
    await archive.finalize();
    console.log('Archive finalized.');

    // 6. Collect the entire stream into a Buffer
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      outputStream.on('data', chunk => chunks.push(chunk));
      outputStream.on('end', () => resolve(Buffer.concat(chunks)));
      outputStream.on('error', reject);
    });

    console.log('Zip file collected into Buffer.');

    // 7. Determine the filename for the download (moved from server.ts)
    // Fallback to a timestamp-based filename if 'filename' is not provided or invalid
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipfilename: string = `generated-config-${timestamp}.zip`;

    return { zipBuffer, zipfilename };

  } catch (error: any) {
    console.error('Error during file generation or zipping:', error);
    // Re-throw the error so the calling route can handle rendering the error page
    throw new Error(`File generation failed: ${error.message}`);
  } finally {
    // 8. Clean up the temporary directory
    if (tempDir) {
      try {
        // fs.rm is recursive and handles non-empty directories
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError);
      }
    }
  }
}
