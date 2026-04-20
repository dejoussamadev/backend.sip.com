import { promises as fs } from 'fs';
import * as path from 'path';

export type SeedAssets = {
  agentPhotos: string[];
  landlordPhotos: string[];
  propertyImages: string[];
  landlordAgreements: string[];
  landlordContracts: string[];
  propertyDocuments: string[];
};

type PexelsPhoto = {
  id: number;
  src?: {
    large2x?: string;
    large?: string;
    medium?: string;
  };
};

function seededUploadPath(...segments: string[]): string {
  return `/uploads/${segments.join('/')}`;
}

function extensionFromContentType(contentType: string | null): string {
  switch (contentType) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

async function fetchPexelsPhotos(options: {
  count: number;
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY ?? 'oRUlIKQrjaMw4scf2oomBbudrGvzJUJY8umJh37nfJWwBT6wXCejka6T';
  if (options.count <= 0) return [];

  const params = new URLSearchParams({
    query: options.query,
    per_page: String(Math.min(options.count, 80)),
  });

  if (options.orientation) {
    params.set('orientation', options.orientation);
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: apiKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Pexels responded with HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as { photos?: PexelsPhoto[] };
    const photos = (payload.photos ?? []).slice(0, options.count);
    console.log(`  ✓ Pexels returned ${photos.length} photos for "${options.query}"`);
    return photos;
  } catch (err) {
    console.warn(
      `  ! Pexels fetch failed for "${options.query}": ${err instanceof Error ? err.message : String(err)}. Falling back to placeholder paths.`,
    );
    return [];
  }
}

async function downloadImageToUploads(options: {
  url: string;
  filenameBase: string;
}): Promise<string | null> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads/images');
  await fs.mkdir(uploadsDir, { recursive: true });

  try {
    const response = await fetch(options.url);

    if (!response.ok) {
      throw new Error(`Image download responded with HTTP ${response.status}`);
    }

    const extension = extensionFromContentType(
      response.headers.get('content-type'),
    );
    const filename = `${options.filenameBase}${extension}`;
    const filePath = path.join(uploadsDir, filename);
    const arrayBuffer = await response.arrayBuffer();

    await fs.writeFile(filePath, Buffer.from(arrayBuffer));
    console.log(`    ↓ Written: ${filePath}  →  DB path: ${seededUploadPath('images', filename)}`);

    return seededUploadPath('images', filename);
  } catch (err) {
    console.warn(`  ! Failed to download image "${options.filenameBase}": ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function prepareDownloadedImages(options: {
  count: number;
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  filenamePrefix: string;
}): Promise<string[]> {
  const photos = await fetchPexelsPhotos({
    count: options.count,
    query: options.query,
    orientation: options.orientation,
  });

  const downloads = await Promise.all(
    photos
      .map((photo, index) => ({
        url: photo.src?.large2x ?? photo.src?.large ?? photo.src?.medium,
        filenameBase: `${options.filenamePrefix}-${photo.id}-${index + 1}`,
      }))
      .filter((photo): photo is { url: string; filenameBase: string } =>
        Boolean(photo.url),
      )
      .map((photo) => downloadImageToUploads(photo)),
  );

  return downloads.filter((filePath): filePath is string => Boolean(filePath));
}

async function removeSeededFiles(
  dirSegments: string[],
  prefixes: string[],
): Promise<void> {
  const targetDir = path.resolve(process.cwd(), ...dirSegments);

  try {
    const filenames = await fs.readdir(targetDir);
    const seededFiles = filenames.filter((name) =>
      prefixes.some((prefix) => name.startsWith(prefix)),
    );

    await Promise.all(
      seededFiles.map((filename) => fs.unlink(path.join(targetDir, filename))),
    );
    if (seededFiles.length > 0) {
      console.log(`  ✓ Removed ${seededFiles.length} old seed files from ${targetDir}`);
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn(
        `  ! Failed to clean seeded files in ${targetDir}: ${error?.message ?? String(error)}`,
      );
    }
  }
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createSimplePdf(lines: string[]): Buffer {
  const contentLines = ['BT', '/F1 18 Tf', '50 790 Td'];

  lines.forEach((line, index) => {
    if (index > 0) {
      contentLines.push('0 -24 Td');
    }
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });

  contentLines.push('ET');
  const stream = `${contentLines.join('\n')}\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n 
`;
  }

  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

async function generatePdfToUploads(options: {
  dirSegments: string[];
  filename: string;
  lines: string[];
}): Promise<string> {
  const targetDir = path.resolve(process.cwd(), ...options.dirSegments);
  await fs.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, options.filename);
  await fs.writeFile(filePath, createSimplePdf(options.lines));

  return seededUploadPath(...options.dirSegments.slice(1), options.filename);
}

async function preparePdfSeries(options: {
  count: number;
  dirSegments: string[];
  filenamePrefix: string;
  buildLines: (index: number) => string[];
}): Promise<string[]> {
  return Promise.all(
    Array.from({ length: options.count }, (_, index) =>
      generatePdfToUploads({
        dirSegments: options.dirSegments,
        filename: `${options.filenamePrefix}-${index + 1}.pdf`,
        lines: options.buildLines(index),
      }),
    ),
  );
}

export async function prepareSeedAssets(): Promise<SeedAssets> {
  console.log(`  → process.cwd() = ${process.cwd()}`);
  console.log(`  → Resolved uploads root: ${path.resolve(process.cwd(), 'uploads')}`);
  await Promise.all([
    removeSeededFiles(
      ['uploads', 'images'],
      ['seed-agent-', 'seed-landlord-', 'seed-property-'],
    ),
    removeSeededFiles(
      ['uploads', 'landlords'],
      ['seed-landlord-agreement-', 'seed-landlord-contract-'],
    ),
    removeSeededFiles(['uploads', 'documents'], ['seed-property-document-']),
  ]);

  const imagePromise = Promise.all([
    prepareDownloadedImages({
      count: 11,
      query: 'real estate agent portrait',
      orientation: 'portrait',
      filenamePrefix: 'seed-agent',
    }),
    prepareDownloadedImages({
      count: 10,
      query: 'business owner portrait',
      orientation: 'portrait',
      filenamePrefix: 'seed-landlord',
    }),
    prepareDownloadedImages({
      count: 30,
      query: 'luxury apartment interior',
      orientation: 'landscape',
      filenamePrefix: 'seed-property',
    }),
  ]);

  const pdfPromise = Promise.all([
    preparePdfSeries({
      count: 10,
      dirSegments: ['uploads', 'landlords'],
      filenamePrefix: 'seed-landlord-agreement',
      buildLines: (index) => [
        `Marketing Agreement ${index + 1}`,
        'Step In Property',
        `Landlord reference: LL-${String(index + 1).padStart(3, '0')}`,
        'This is generated seed content for testing uploads.',
      ],
    }),
    preparePdfSeries({
      count: 10,
      dirSegments: ['uploads', 'landlords'],
      filenamePrefix: 'seed-landlord-contract',
      buildLines: (index) => [
        `Draft Contract ${index + 1}`,
        'Step In Property',
        `Contract reference: CT-${String(index + 1).padStart(3, '0')}`,
        'This is generated seed content for testing uploads.',
      ],
    }),
    preparePdfSeries({
      count: 20,
      dirSegments: ['uploads', 'documents'],
      filenamePrefix: 'seed-property-document',
      buildLines: (index) => [
        `Property Brochure ${index + 1}`,
        'Step In Property',
        `Property reference: PROP${String(index + 1).padStart(6, '0')}`,
        'This is generated seed content for testing uploads.',
      ],
    }),
  ]);

  const [
    [agentPhotos, landlordPhotos, propertyImages],
    [landlordAgreements, landlordContracts, propertyDocuments],
  ] = await Promise.all([imagePromise, pdfPromise]);

  const warn = ' ⚠ empty — placeholder paths will be stored';
  console.log('  → Asset summary:');
  console.log(
    `      agentPhotos:       ${agentPhotos.length} files${agentPhotos.length === 0 ? warn : ''}`,
  );
  console.log(
    `      landlordPhotos:    ${landlordPhotos.length} files${landlordPhotos.length === 0 ? warn : ''}`,
  );
  console.log(
    `      propertyImages:    ${propertyImages.length} files${propertyImages.length === 0 ? warn : ''}`,
  );
  console.log(`      landlordAgreements: ${landlordAgreements.length} PDFs`);
  console.log(`      landlordContracts:  ${landlordContracts.length} PDFs`);
  console.log(`      propertyDocuments:  ${propertyDocuments.length} PDFs`);
  if (agentPhotos.length > 0)
    console.log(`      sample agentPhoto: ${agentPhotos[0]}`);
  if (landlordAgreements.length > 0)
    console.log(`      sample agreement:  ${landlordAgreements[0]}`);

  return {
    agentPhotos,
    landlordPhotos,
    propertyImages,
    landlordAgreements,
    landlordContracts,
    propertyDocuments,
  };
}

export function seededAssetPath(...segments: string[]): string {
  return seededUploadPath(...segments);
}
