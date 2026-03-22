import { readFile } from "node:fs/promises";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const windows1252Decoder = new TextDecoder("windows-1252");

export async function readCsvRows(
  filePath: string,
): Promise<Record<string, string>[]> {
  const buffer = await readFile(filePath);
  const content = decodeCsv(buffer);
  const parsedRows = parseCsv(content);

  if (parsedRows.length === 0) {
    return [];
  }

  const [headerRow, ...valueRows] = parsedRows;
  const headers = headerRow.map((header) => stripBom(header.trim()));

  return valueRows
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) =>
      headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = row[index]?.trim() ?? "";
        return record;
      }, {}),
    );
}

function decodeCsv(buffer: Buffer) {
  try {
    return utf8Decoder.decode(buffer);
  } catch {
    return windows1252Decoder.decode(buffer);
  }
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(currentValue);
      rows.push(row);
      row = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue !== "" || row.length > 0) {
    row.push(currentValue);
    rows.push(row);
  }

  return rows;
}

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
