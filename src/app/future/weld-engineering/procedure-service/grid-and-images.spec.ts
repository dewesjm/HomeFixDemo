import { procedures, getProcedure as procedureRow } from '../../../data/procedures';
import { loadImage, removeImage, saveImage, storedImageIds } from '../../../data/procedure-images';
import { procedureSections, SEEDED_SECTION_IDS, findField } from '../procedure-sections';
import { keepProcedureStores, testProcedure, TEST_WTN } from '../testing/procedure-test-state';
import { procedureDocDefinition } from '../procedure-pdf/procedure-pdf';
import { columnText, sectionColumns } from '../procedure-files';
import { parseCell } from '../admin/load-procedures/rules/procedure-import';
import { addField, addSection, getProcedureFields } from './section-service';
import { getProcedure, findProcedures, updateProcedureFields } from './procedure-service';
import { getProcedureImage, removeUnusedImages, uploadProcedureImage } from './procedure-image-service';

const GWP = 'GRID-1';
const key = { gwp: GWP, wtn: TEST_WTN };
/* a 2 x 2 pixel PNG */
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGNgYGD4z8DAwMDAAAAJAAH6+e0+AAAAAElFTkSuQmCC';

describe('grid and images fields', () => {
  keepProcedureStores();
  let sectionId: string;
  const made: string[] = [];

  beforeEach(() => {
    const s = addSection('Technique');
    if (!s.ok) throw new Error(s.error);
    sectionId = s.data.section.id;
    const grid = addField(sectionId, { label: 'Passes', type: 'grid', columns: [
      { label: 'Layer', type: 'list', options: ['Root', 'Fill', 'Cap'] },
      { label: 'Amps', type: 'range' },
      { label: 'Interpass', type: 'limit' },
    ] });
    if (!grid.ok) throw new Error(grid.error);
    const images = addField(sectionId, { label: 'Sketches', type: 'images' });
    if (!images.ok) throw new Error(images.error);
    procedures.set([testProcedure(GWP, { sectionIds: [...SEEDED_SECTION_IDS, sectionId] })]);
  });

  afterEach(() => {
    made.splice(0).forEach(removeImage);
  });

  async function upload(name = 'joint.png'): Promise<string> {
    const r = await uploadProcedureImage({ fileName: name, contentType: 'image/png', base64: PNG });
    if (!r.ok) throw new Error(r.error);
    made.push(r.data.id);
    return r.data.id;
  }

  describe('grid', () => {
    it('makes column keys from the labels and lists them in getProcedureFields', () => {
      const f = findField('passes', procedureSections())!;
      expect(f.columns!.map(c => c.key)).toEqual(['layer', 'amps', 'interpass']);
      const r = getProcedureFields();
      const def = r.ok ? r.data.fields.find(x => x.key === 'passes') : undefined;
      expect(def?.columns?.map(c => c.key)).toEqual(['layer', 'amps', 'interpass']);
      expect(def?.filter).toBeNull();
    });

    it('refuses a grid with no columns, a repeated column, or a list column without choices', () => {
      const r1 = addField(sectionId, { label: 'G1', type: 'grid' });
      const r2 = addField(sectionId, { label: 'G2', type: 'grid', columns: [{ label: 'A', type: 'text' }, { label: 'a', type: 'number' }] });
      const r3 = addField(sectionId, { label: 'G3', type: 'grid', columns: [{ label: 'Layer', type: 'list' }] });
      expect(r1.ok ? '' : r1.error).toBe('Add at least one column to a grid field.');
      expect(r2.ok ? '' : r2.error).toBe('There is more than one column called a.');
      expect(r3.ok ? '' : r3.error).toBe('Enter at least one choice for column Layer.');
    });

    it('writes a list of rows and reads them back as rows, blank rows and cells left out', () => {
      const w = updateProcedureFields(key, { passes: [
        { layer: 'Root', amps: { min: 90, max: 120 }, interpass: '350' },
        { layer: '', interpass: '' },
        { layer: 'Cap', interpass: 'nc' },
      ] });
      if (!w.ok) return fail(w.error);
      const r = getProcedure(key, { status: 'draft', fields: ['passes'] });
      if (!r.ok) return fail(r.error);
      const field = r.data.procedure.sections[0].fields[0];
      expect(field.value).toEqual({
        kind: 'rows',
        columns: [{ key: 'layer', label: 'Layer', type: 'list' }, { key: 'amps', label: 'Amps', type: 'range' }, { key: 'interpass', label: 'Interpass', type: 'limit' }],
        rows: [{ layer: 'Root', amps: { min: 90, max: 120 }, interpass: '350' }, { layer: 'Cap', interpass: 'NC' }],
      });
      expect(field.text).toBe('Layer Root, Amps 90 - 120, Interpass 350; Layer Cap, Interpass NC');
    });

    it('refuses an unknown column, a cell of the wrong kind and a choice the column lacks', () => {
      const bad = (rows: unknown) => { const r = updateProcedureFields(key, { passes: rows }); return r.ok ? '' : r.error; };
      expect(bad([{ volts: '12' }])).toContain('volts isn\'t one of its columns');
      expect(bad([{ interpass: 'hot' }])).toBe('Passes row 1 Interpass must be a number or NC.');
      expect(bad([{ amps: { min: 200, max: 100 } }])).toBe('Passes row 1 Amps: Min is more than Max.');
      expect(bad([{ layer: 'Middle' }])).toBe('Passes (passes) column Layer doesn\'t allow Middle.');
      expect(bad('rows')).toContain('needs a list of rows');
    });

    it('can\'t be filtered on', () => {
      const r = findProcedures({ passes: 'Root' }, { status: 'draft' });
      expect(r.ok ? '' : r.error).toBe('Passes (passes) can\'t be filtered on: it\'s a grid.');
    });

    it('exports as JSON rows that load back, and prints as a table', () => {
      updateProcedureFields(key, { passes: [{ layer: 'Root', interpass: '350' }] });
      const p = procedureRow(GWP, TEST_WTN)!;
      const col = sectionColumns(procedureSections()).find(c => c.id === 'passes')!;
      const text = columnText(col, p.extraFields['passes']);
      expect(text).toBe('[{"layer":"Root","interpass":"350"}]');
      expect(parseCell(col, text)).toEqual({ value: { rows: [{ layer: 'Root', interpass: '350' }] } });
      const content = procedureDocDefinition(p, procedureSections()).content as any[];
      const label = content.findIndex(c => c?.text === 'Passes');
      expect(content[label + 1].table.body).toEqual([
        [{ text: 'Layer', bold: true, fillColor: '#eeeeee' }, { text: 'Amps', bold: true, fillColor: '#eeeeee' }, { text: 'Interpass', bold: true, fillColor: '#eeeeee' }],
        ['Root', '-', '350'],
      ]);
    });
  });

  describe('images', () => {
    it('uploads a shrunk JPEG and answers its id; getProcedureImage fetches it', async () => {
      const id = await upload('butt joint.png');
      const r = getProcedureImage(id);
      if (!r.ok) return fail(r.error);
      expect(r.data.fileName).toBe('butt joint.jpg');
      expect(r.data.contentType).toBe('image/jpeg');
      expect(atob(r.data.base64).charCodeAt(0)).toBe(0xff);
      expect(getProcedureImage('img-none').ok).toBeFalse();
    });

    it('refuses a file that isn\'t a PNG, JPEG, GIF or WebP image', async () => {
      const wrongType = await uploadProcedureImage({ fileName: 'a.pdf', contentType: 'application/pdf', base64: PNG });
      const notImage = await uploadProcedureImage({ fileName: 'a.png', contentType: 'image/png', base64: btoa('hello') });
      expect(wrongType.ok ? '' : wrongType.title).toBe('Image not added');
      expect(notImage.ok ? '' : notImage.error).toBe('a.png couldn\'t be read as an image.');
    });

    it('writes image ids with captions and reads back references only', async () => {
      const id = await upload();
      const w = updateProcedureFields(key, { sketches: [{ id, caption: ' Butt joint ' }] });
      if (!w.ok) return fail(w.error);
      const r = getProcedure(key, { status: 'draft', fields: ['sketches'] });
      if (!r.ok) return fail(r.error);
      expect(r.data.procedure.sections[0].fields[0].value).toEqual({ kind: 'images', images: [{ id, name: 'joint.jpg', caption: 'Butt joint' }] });
      const unknown = updateProcedureFields(key, { sketches: [{ id: 'img-none' }] });
      expect(unknown.ok ? '' : unknown.error).toContain('there is no image with id img-none');
    });

    it('prints the images on the PDF with their captions, and leaves them out of the spreadsheet', async () => {
      const id = await upload();
      updateProcedureFields(key, { sketches: [{ id, caption: 'Butt joint' }] });
      const p = procedureRow(GWP, TEST_WTN)!;
      const content = procedureDocDefinition(p, procedureSections(), x => x === id ? 'data:image/jpeg;base64,AAAA' : null).content as any[];
      const row = content[content.findIndex(c => c?.text === 'Sketches') + 1];
      expect(row.columns[0].stack[0].image).toBe('data:image/jpeg;base64,AAAA');
      expect(row.columns[0].stack[1].text).toBe('Butt joint');
      expect(sectionColumns(procedureSections()).some(c => c.field.key === 'sketches')).toBeFalse();
    });

    it('removes stored images no procedure uses, except ones uploaded during this page load', async () => {
      const fresh = await upload();
      saveImage('img-old-orphan', { name: 'old.jpg', contentType: 'image/jpeg', base64: 'AAAA' });
      made.push('img-old-orphan');
      removeUnusedImages();
      expect(loadImage('img-old-orphan')).toBeNull();
      expect(storedImageIds()).toContain(fresh);
    });
  });
});
