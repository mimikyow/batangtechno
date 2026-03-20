
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts various Google Drive sharing links to an embeddable preview link.
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  if (!url) return "";
  
  let fileId = "";
  
  const dMatch = url.match(/\/d\/([^/?#]+)/);
  if (dMatch && dMatch[1]) {
    fileId = dMatch[1];
  } 
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

/**
 * Converts Google Drive sharing links to direct image URLs for display.
 */
export function getGoogleDriveImageUrl(url: string): string {
  if (!url) return "";
  
  // If it's already a direct link or not from drive, return as is
  if (!url.includes("drive.google.com") && !url.includes("google.com/file")) return url;

  let fileId = "";
  
  const dMatch = url.match(/\/d\/([^/?#]+)/);
  if (dMatch && dMatch[1]) {
    fileId = dMatch[1];
  } else {
    const idMatch = url.match(/[?&]id=([^&/?#]+)/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    }
  }
  
  if (fileId) {
    // Return direct image link format
    return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
  }
  
  return url;
}
