import { create } from 'zustand'
import type { Upload } from '@/types'
import api from '@/lib/api-client'

interface FileState {
  uploads: Upload[]
  isUploading: boolean
  uploadFile: (file: File, roomId?: string, visibility?: string) => Promise<Upload>
  downloadFile: (fileId: string) => Promise<void>
}

export const useFileStore = create<FileState>()((set) => ({
  uploads: [],
  isUploading: false,

  uploadFile: async (file: File, roomId?: string, visibility = 'ROOM') => {
    set({ isUploading: true })
    const formData = new FormData()
    formData.append('file', file)
    if (roomId) formData.append('roomId', roomId)
    formData.append('visibility', visibility)

    try {
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      set({ isUploading: false })
      return data.data
    } catch {
      set({ isUploading: false })
      throw new Error('Upload failed')
    }
  },

  downloadFile: async (fileId: string) => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', response.headers['x-filename'] || 'download')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}))
