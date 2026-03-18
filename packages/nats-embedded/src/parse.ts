export function parsePort(line: string): number | null {
  const match = line.match(/Listening for client connections on .+:(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
