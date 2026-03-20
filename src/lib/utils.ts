import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a standard Google Drive sharing link to an embeddable preview link.
 * Example: https://drive.google.com/file/d/12345/view -> https://drive.google.com/file/d/12345/preview
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  if (!url) return "";
  
  // Extract the file ID using regex
  const fileIdMatch = url.match(/\/d\/([^/]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
  }
  
  return url;
}
