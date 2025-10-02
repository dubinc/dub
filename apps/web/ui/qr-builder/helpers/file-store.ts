let globalFiles: File[] | null = null;

export function setFiles(files: File[] | null) {
  globalFiles = files;
}

export function getFiles(): File[] | null {
  return globalFiles;
}
