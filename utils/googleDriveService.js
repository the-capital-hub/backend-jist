import fs from "fs/promises";
import { google } from "googleapis";
import stream from 'stream';
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);

const _dirname = dirname(__filename);

const SERVICE_ACCOUNT_KEY_FILE = path.join(_dirname, "credForDocUpload.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_KEY_FILE,
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });

const setFilePermissions = async (fileId) => {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    console.log(`Permissions set to anyone with the link for file ID: ${fileId}`);
  } catch (error) {
    console.error("Error setting file permissions:", error);
    throw error;
  }
};

export const uploadFileToDrive = async (fileObject, fileName) => {
  try {
    console.log(fileName)
    // Log fileObject to debug its contents
    console.log('fileObject:', fileObject);

    // Ensure buffer is not empty
    if (!fileObject.buffer || fileObject.buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    //uploading to Gdrive starts
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    
    const { data } = await drive.files.create({
        media: {
            mimeType: fileObject.mimeType,
            body: bufferStream,
        },
        requestBody: {
            name: fileName,
            parents: ["113H-8prXNGpCoibH-Mf6j5C6XB6avfEr"],
        },
        fields: "id,name,webViewLink",
    });

    console.log(`Uploaded file ${data.name} ${data.id}`);

    await setFilePermissions(data.id);
    const filePath = path.join("uploads", fileObject.originalname);
    await fs.unlink(filePath);
    console.log(`File ${filePath} deleted from the upload folder`);
    return data; // Return the response data

  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    throw error;
  }
};
