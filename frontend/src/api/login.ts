export interface LoginPayload {
  username: string;
  password: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'


export async function loginCheckin(payload: LoginPayload): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/login_check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}