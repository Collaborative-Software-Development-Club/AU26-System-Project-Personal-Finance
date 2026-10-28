interface CsvRow {
  [key: string]: string | number;
}

interface ChunkPayload {
  uploadId: string;      // Identifies the overall file upload session
  chunkIndex: number;    // The sequential order of this batch
  rows: CsvRow[];
}

export function generateIdempotencyKey(): string {
  // Uses native browser or Node.js web crypto API
  return crypto.randomUUID();
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'



/**
 * Helper to parse raw CSV text into an array of CsvRow objects.
 * Assumes the first row of the CSV contains the headers.
 */
function parseCsvToObjects(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: CsvRow = {};
    
    headers.forEach((header, index) => {
      const val = values[index] ?? "";
      // Simple parsing: check if value is numeric, otherwise keep as string
      row[header] = !isNaN(Number(val)) && val !== "" ? Number(val) : val;
    });
    
    rows.push(row);
  }

  return rows;
}

/**
 * Reads a single CSV file, converts it into a single JSON batch payload,
 * and executes the upload process.
 */
export async function uploadCSV(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsedRows = parseCsvToObjects(text);

        // Package the entire file as a single tracking chunk (index 0)
        const payload: ChunkPayload = {
          uploadId: crypto.randomUUID(), // Generates a unique ID for this entire file session
          chunkIndex: 0,
          rows: parsedRows
        };

        // Hand off the payload to your existing upload function
        const result = await uploadFile(payload);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the local CSV file."));
    };

    reader.readAsText(file);
  });
}

/**
 * Exports the payload chunk to the /upload api endpoints
 * @param payload 
 * @returns result of the API reponse
 */
export async function uploadFile(payload: ChunkPayload): Promise<any> {
  const idempotencyKey = generateIdempotencyKey();
  // We are using JSON.stringfy instead of FormData since we are not storing raw files, and may split data before sending

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers : {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
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

  return (await result)
}