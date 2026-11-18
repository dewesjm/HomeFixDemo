/* Weld Engineering's procedure image calls (procedure-service/procedure-image-service.ts) as service
   tester operations. exampleImageId: an image some procedure shows, so getProcedureImage answers
   something the first time it's run ('' when there is none yet). */
import type { ServiceOperation } from '../../../../../shared/service-tester-panel/service-operation';
import { getProcedureImage, uploadProcedureImage, IMAGE_TYPES, type ImageUpload } from '../../../procedure-service/procedure-image-service';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/* a 2 x 2 pixel grey PNG, so the upload can be tried without a file */
const SAMPLE_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGNgYGD4z8DAwMDAAAAJAAH6+e0+AAAAAElFTkSuQmCC';

export function imageServiceOperations(exampleImageId: string): ServiceOperation[] {
  return [
    {
      name: 'getProcedureImage',
      signature: 'getProcedureImage(id)',
      description: 'One image from a procedure\'s images field. Reads answer each image\'s id, name and caption; this fetches the file itself as its name, type and the file base64 encoded.',
      writes: false,
      important: true,
      params: [{
        name: 'id', label: 'Image id', type: 'text', required: true, example: exampleImageId,
        help: 'The id from an images field in getProcedure\'s answer.',
      }],
      call: a => [str(a['id'])],
      fn: getProcedureImage,
    },
    {
      name: 'uploadProcedureImage',
      signature: 'uploadProcedureImage({ fileName, contentType, base64 })',
      description: 'Stores an image, shrunk to at most 1000 pixels a side and saved as a JPEG, and answers its id. Put the id in an images field with updateProcedureFields to show it on a procedure; an image no procedure uses is removed later.',
      writes: true,
      params: [{
        name: 'file', label: 'File', type: 'json', required: true,
        example: `{ "fileName": "sample.png", "contentType": "image/png", "base64": "${SAMPLE_PNG}" }`,
        help: `contentType: ${IMAGE_TYPES.join(', ')}. At most 15 MB.`,
      }],
      call: a => [(a['file'] ?? {}) as ImageUpload],
      fn: uploadProcedureImage,
    },
  ];
}
