/** Starts the WinForms test target and follows its stdout events. */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface Rect { x: number; y: number; width: number; height: number }
export interface Ready { form: Rect; box: Rect; button: Rect; list: Rect; swatch: Rect; title: string }

export class Target {
  readonly events: Array<Record<string, unknown>> = [];
  private constructor(private readonly child: ChildProcess) {
    let buf = '';
    child.stdout!.on('data', (d: Buffer) => {
      buf += d.toString('utf8');
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.startsWith('{')) this.events.push(JSON.parse(line) as Record<string, unknown>);
      }
    });
  }

  static async open(title: string): Promise<{ target: Target; ready: Ready }> {
    const script = fileURLToPath(new URL('./target-form.ps1', import.meta.url));
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Title', title], { stdio: ['ignore', 'pipe', 'inherit'] });
    const target = new Target(child);
    const ready = await target.next((e) => e.event === 'ready', 30_000) as unknown as Ready;
    return { target, ready };
  }

  async next(match: (e: Record<string, unknown>) => boolean, timeoutMs = 10_000): Promise<Record<string, unknown>> {
    const start = Date.now();
    for (;;) {
      const hit = this.events.find(match);
      if (hit) { this.events.splice(this.events.indexOf(hit), 1); return hit; }
      if (Date.now() - start > timeoutMs) throw new Error('target: event not seen');
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  close(): void {
    this.child.kill();
  }
}

export const center = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
