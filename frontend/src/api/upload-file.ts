interface UploadResponse {
  filename: string | null
  content_type: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  })

  const result = await response.json();

  if (response.ok){
    console.log("Import Complete:", result.message);
    alert(result.message);
  }
  else{
    console.error(`File upload failed: ${response.status} ${response.statusText}`)
    alert("Error: " + result.detail);
  }

  return (await response.json()) as UploadResponse
}