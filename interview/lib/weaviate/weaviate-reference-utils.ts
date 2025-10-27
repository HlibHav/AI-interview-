import { referenceTargets } from './weaviate-schema';

export type ReferenceValue =
  | string
  | string[]
  | {
      targetClass?: string;
      id?: string;
      ids?: string[];
      beacon?: string;
      beacons?: string[];
    };

type NormalizedReference = {
  property: string;
  beacons: string[];
};

const BEACON_BASE = 'weaviate://localhost';

export function extractObjectId(result: any, fallbackId?: string): string {
  return (
    result?.id ||
    result?._additional?.id ||
    result?.properties?.id ||
    fallbackId ||
    ''
  );
}

export function normalizeReferences(
  className: string,
  references: Record<string, ReferenceValue> | undefined
): NormalizedReference[] {
  if (!references || Object.keys(references).length === 0) {
    return [];
  }

  const classTargets = referenceTargets[className] || {};
  const normalized: NormalizedReference[] = [];

  for (const [property, rawValue] of Object.entries(references)) {
    if (!rawValue) {
      continue;
    }

    const explicitTargetClass =
      typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue.targetClass
        : undefined;

    const targetClass = explicitTargetClass || classTargets[property];
    if (!targetClass) {
      console.warn(
        `[WEAVIATE] Unable to determine target class for reference ${property} on ${className}`
      );
      continue;
    }

    const beacons: string[] = [];
    const appendBeacon = (beacon: string | undefined) => {
      if (beacon) {
        beacons.push(beacon);
      }
    };
    const buildBeacon = (id: string | undefined) =>
      id ? `${BEACON_BASE}/${targetClass}/${id}` : undefined;

    if (typeof rawValue === 'string') {
      appendBeacon(buildBeacon(rawValue));
    } else if (Array.isArray(rawValue)) {
      rawValue.forEach((id) => appendBeacon(buildBeacon(id)));
    } else {
      appendBeacon(rawValue.beacon);
      rawValue.beacons?.forEach((beacon) => appendBeacon(beacon));

      if (rawValue.id) {
        appendBeacon(buildBeacon(rawValue.id));
      }
      rawValue.ids?.forEach((id) => appendBeacon(buildBeacon(id)));
    }

    if (beacons.length === 0) {
      console.warn(
        `[WEAVIATE] No valid beacons generated for ${property} on ${className}`
      );
      continue;
    }

    normalized.push({
      property,
      beacons
    });
  }

  return normalized;
}

export async function applyReferencesToObject(
  client: any,
  className: string,
  id: string,
  references: Record<string, ReferenceValue> | undefined
) {
  const normalized = normalizeReferences(className, references);
  if (normalized.length === 0) {
    return;
  }

  for (const { property, beacons } of normalized) {
    await client.data
      .referenceReplacer()
      .withClassName(className)
      .withId(id)
      .withReferenceProperty(property)
      .withReferences(beacons.map((beacon) => ({ beacon })))
      .do();
  }
}
