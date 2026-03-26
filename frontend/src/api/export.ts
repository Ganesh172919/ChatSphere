import api from './axios';

export async function exportConversations(): Promise<Blob> {
  const { data } = await api.get('/export/conversations', {
    responseType: 'blob',
  });
  return data;
}

export async function exportRoom(roomId: string): Promise<Blob> {
  const { data } = await api.get(`/export/rooms/${roomId}`, {
    responseType: 'blob',
  });
  return data;
}

// Helper to trigger download
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
