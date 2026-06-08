/**
 * Google Drive API v3 Service - Handles direct integration
 */

const STUDIO_FOLDER_NAME = "🎬 AI for Everyone — Media Kit";

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Searches for or creates a dedicated directory folder in the user's Google Drive.
 */
export async function findOrCreateFolder(accessToken: string, folderName: string = STUDIO_FOLDER_NAME): Promise<string> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const response = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query Google Drive directories: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0].id;
  }

  // Create folder if not found
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create dedicated folder on Google Drive: ${createResponse.status} - ${errorText}`);
  }

  const createResult = await createResponse.json();
  return createResult.id;
}

/**
 * Uploads a raw binary file (image, workflow JSON, reusable prompt text, etc.) to the specified folder.
 */
export async function uploadRawFile(
  accessToken: string,
  file: File,
  folderId: string
): Promise<GoogleDriveFile> {
  // Step 1: Create file metadata reference inside the folder
  const metadataResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      parents: [folderId],
    }),
  });

  if (!metadataResponse.ok) {
    const errorText = await metadataResponse.text();
    throw new Error(`Failed to create file metadata: ${metadataResponse.status} - ${errorText}`);
  }

  const fileMetadata = await metadataResponse.json();
  const fileId = fileMetadata.id;

  // Step 2: Upload raw file contents
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const mediaResponse = await fetch(uploadUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!mediaResponse.ok) {
    const errorText = await mediaResponse.text();
    throw new Error(`Failed to upload file content: ${mediaResponse.status} - ${errorText}`);
  }

  return {
    id: fileId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    ...fileMetadata
  };
}

/**
 * Lists all markdown and document files within our dedicated Google Drive folder.
 */
export async function listStudioScripts(accessToken: string, folderId: string): Promise<GoogleDriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

  const response = await fetch(listUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list Google Drive files: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.files || [];
}

/**
 * Uploads a newly generated script to our dedicated folder.
 * Uses HTTP multipart related layout to pass metadata and file blob in one transaction.
 */
export async function uploadScript(
  accessToken: string,
  fileName: string,
  content: string,
  folderId: string
): Promise<GoogleDriveFile> {
  const cleanFileName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  
  const metadata = {
    name: cleanFileName,
    mimeType: "text/markdown",
    parents: [folderId],
  };

  const boundary = "studio_agent_boundary_delim";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = 
    delimiter +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: text/markdown; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink";

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload script to Google Drive: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Updates an existing script content in Google Drive.
 * Requires user confirmation from the UI as per guidelines.
 */
export async function updateScript(
  accessToken: string,
  fileId: string,
  content: string
): Promise<void> {
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const response = await fetch(uploadUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/markdown; charset=UTF-8",
    },
    body: content,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update existing script content in Google Drive: ${response.status} - ${errorText}`);
  }
}

/**
 * Deletes a script file in Google Drive (moves to trash or deletes).
 * Always guarded by confirmation.
 */
export async function deleteScript(accessToken: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete Google Drive file: ${response.status} - ${errorText}`);
  }
}

/**
 * Downloads the raw markdown content of a file of interest.
 */
export async function downloadScriptContent(accessToken: string, fileId: string): Promise<string> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download script content from Google Drive: ${response.status} - ${errorText}`);
  }

  return await response.text();
}

