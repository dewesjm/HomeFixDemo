import { packFieldLines, PDF_CONTENT_WIDTH, type PdfFieldCell } from './pdf-field-lines';

const short = (label: string, width?: PdfFieldCell['width']): PdfFieldCell => ({ label, value: '1', width });
/* page width each line takes up: column widths plus padding and borders */
const lineWidth = (widths: number[]) => 0.5 + widths.reduce((a, w) => a + w + 8.5, 0);

describe('PDF field lines', () => {
  it('keeps a few short fields on one line that fills the page', () => {
    const lines = packFieldLines([short('PH Min'), short('PH Max'), short('IP Min'), short('IP Max')]);
    expect(lines.length).toBe(1);
    expect(lineWidth(lines[0].widths)).toBeCloseTo(PDF_CONTENT_WIDTH, 0);
  });

  it('starts a new line when the next field will not fit, and never overflows the page', () => {
    const cells = Array.from({ length: 20 }, (_, i) => short(`Field number ${i + 1}`));
    const lines = packFieldLines(cells);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.flatMap(l => l.cells)).toEqual(cells);
    for (const l of lines) expect(lineWidth(l.widths)).toBeLessThanOrEqual(PDF_CONTENT_WIDTH + 0.01);
  });

  it('sizes Auto fields from the longer of label and value, at most half the page', () => {
    const [line] = packFieldLines([
      { label: 'Gas', value: '75% Argon / 25% CO2 at the torch, 100% Argon backing purge' },
      { label: 'A', value: '1' },
    ], 1000);
    expect(line.cells.length).toBe(2);
    expect(line.widths[0]).toBeGreaterThan(line.widths[1]);
    const lines = packFieldLines([{ label: 'Gas', value: 'x'.repeat(400) }, { label: 'Next', value: 'x'.repeat(400) }]);
    expect(lines.length).toBe(1);
    expect(lines[0].widths[0]).toBeCloseTo(lines[0].widths[1], 1);
  });

  it('uses a set pixel width as given (converted to points), without stretching it', () => {
    const [line] = packFieldLines([short('Set', 200), short('Auto')]);
    expect(line.widths[0]).toBeCloseTo(200 * 0.75 - 8.5, 1);
    expect(lineWidth(line.widths)).toBeCloseTo(PDF_CONTENT_WIDTH, 0);
    const [alone] = packFieldLines([short('Set', 200)]);
    expect(alone.widths[0]).toBeCloseTo(141.5, 1);
  });

  it('caps a set width at the page width', () => {
    const lines = packFieldLines([short('Huge', 5000), short('Next')]);
    expect(lines.length).toBe(2);
    expect(lineWidth(lines[0].widths)).toBeLessThanOrEqual(PDF_CONTENT_WIDTH + 0.5);
  });

  it('gives a Full line field a line of its own', () => {
    const lines = packFieldLines([short('A'), short('Notes', 'full'), short('B'), short('C')]);
    expect(lines.map(l => l.cells.map(c => c.label))).toEqual([['A'], ['Notes'], ['B', 'C']]);
    expect(lineWidth(lines[1].widths)).toBeCloseTo(PDF_CONTENT_WIDTH, 0);
  });

  it('gives nothing for a section with no plain fields', () => {
    expect(packFieldLines([])).toEqual([]);
  });
});
