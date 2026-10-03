import { reportsAPI } from '../services/api';

export async function openBulletinPreview(studentId) {
  const html = await reportsAPI.fetchBulletinHtml(studentId);
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    throw new Error('POPUP_BLOCKED');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return win;
}

export async function printBulletin(studentId) {
  const win = await openBulletinPreview(studentId);
  win.onload = () => {
    win.focus();
    win.print();
  };
  if (win.document.readyState === 'complete') {
    win.focus();
    win.print();
  }
}

export async function downloadBulletin(studentId, studentCode) {
  return reportsAPI.downloadBulletin(studentId, studentCode);
}
