import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts various Google Drive sharing links to an embeddable preview link.
 * Handles:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/edit
 * - https://drive.google.com/open?id=FILE_ID
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  if (!url) return "";
  
  let fileId = "";
  
  // Pattern 1: /d/FILE_ID/
  const dMatch = url.match(/\/d\/([^/?#]+)/);
  if (dMatch && dMatch[1]) {
    fileId = dMatch[1];
  } 
  // Pattern 2: ?id=FILE_ID
  else {
    const idMatch = url.match(/[?&]id=([^&/?#]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    }
  }
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  return url;
}
