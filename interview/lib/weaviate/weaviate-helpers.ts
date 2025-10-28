import weaviate from 'weaviate-ts-client';
import {
  applyReferencesToObject,
  extractObjectId,
  ReferenceValue
} from './weaviate-reference-utils';
import { schemaClasses } from './weaviate-schema';

// Initialize Weaviate client once per runtime
let client: any;
try {
  const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
  const isCloud = weaviateHost.includes('.weaviate.network') || weaviateHost.includes('.weaviate.cloud');

  client = weaviate.client({
    scheme: isCloud ? 'https' : 'http',
    host: weaviateHost,
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY!),
  });
} catch (error) {
  console.error('Failed to initialize Weaviate client:', error);
}

export function getWeaviateClient() {
  if (!client) {
    throw new Error('Weaviate client not initialized');
  }
  return client;
}

async function fetchSchema() {
  const weaviateClient = getWeaviateClient();
  return weaviateClient.schema.getter().do();
}

function findClassSchema(schema: any, className: string) {
  return schema?.classes?.find((schemaClass: any) => schemaClass.class === className);
}

function hasProperty(schemaClass: any, propertyName: string) {
  const properties = schemaClass?.properties ?? [];
  return properties.some((prop: any) => prop.name === propertyName);
}

export async function ensureSchemaProperty(
  className: string,
  property: { name: string; dataType: string[] }
) {
  const schema = await fetchSchema();
  const schemaClass = findClassSchema(schema, className);

  if (!schemaClass) {
    console.warn(`[WEAVIATE] Class ${className} not found when ensuring property ${property.name}`);
    return false;
  }

  if (hasProperty(schemaClass, property.name)) {
    return false;
  }

  const weaviateClient = getWeaviateClient();

  await weaviateClient.schema
    .propertyCreator()
    .withClassName(className)
    .withProperty(property)
    .do();

  console.log(
    `✅ [WEAVIATE] Added missing property ${property.name} (${property.dataType.join(
      ', '
    )}) to ${className}`
  );
  return true;
}

export async function ensureSchemaReference(
  className: string,
  reference: { name: string; targetClass: string }
) {
  return ensureSchemaProperty(className, {
    name: reference.name,
    dataType: [reference.targetClass]
  });
}

export async function ensureSchemaClass(className: string) {
  console.log(`🏗️ [WEAVIATE] Ensuring schema class: ${className}`);
  
  const schemaDefinition = schemaClasses.find((schemaClass) => schemaClass.class === className);
  if (!schemaDefinition) {
    console.warn(`[WEAVIATE] Schema definition for class ${className} not found`);
    return false;
  }

  console.log(`📋 [WEAVIATE] Found schema definition for ${className}:`, {
    properties: schemaDefinition.properties?.length || 0,
    references: schemaDefinition.references?.length || 0
  });

  const schema = await fetchSchema();
  const classExists = !!findClassSchema(schema, className);
  if (classExists) {
    console.log(`✅ [WEAVIATE] Class ${className} already exists`);
    return false;
  }

  console.log(`🔨 [WEAVIATE] Creating class ${className}...`);
  const weaviateClient = getWeaviateClient();

  await weaviateClient.schema
    .classCreator()
    .withClass({
      class: schemaDefinition.class,
      description: schemaDefinition.description,
      properties: schemaDefinition.properties
    })
    .do();

  console.log(`✅ [WEAVIATE] Created class ${className}`);

  if (schemaDefinition.references?.length) {
    console.log(`🔗 [WEAVIATE] Adding ${schemaDefinition.references.length} references to ${className}...`);
    for (const reference of schemaDefinition.references) {
      try {
        await weaviateClient.schema
          .propertyCreator()
          .withClassName(schemaDefinition.class)
          .withProperty({
            name: reference.name,
            dataType: [reference.targetClass]
          })
          .do();
        console.log(`✅ [WEAVIATE] Added reference ${reference.name} -> ${reference.targetClass} to ${className}`);
      } catch (error: any) {
        if (
          !String(error?.message || '').includes(
            `already has a property with name ${reference.name}`
          )
        ) {
          console.warn(
            `⚠️ Failed to add reference ${reference.name} to ${schemaDefinition.class}:`,
            error
          );
        } else {
          console.log(`ℹ️ [WEAVIATE] Reference ${reference.name} already exists on ${className}`);
        }
      }
    }
  }

  console.log(`✅ [WEAVIATE] Ensured schema class ${className}`);
  return true;
}

export async function getObjectWithReferences(className: string, uuid: string) {
  const weaviateClient = getWeaviateClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName(className)
    .withFields(`
      _additional { id }
      ... on ${className} {
        *
      }
    `)
    .withWhere({
      path: ['_additional', 'id'],
      operator: 'Equal',
      valueText: uuid
    })
    .do();

  return result.data?.Get?.[className]?.[0] || null;
}

export async function queryByReference(className: string, refProperty: string, targetUuid: string) {
  const weaviateClient = getWeaviateClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName(className)
    .withFields(`
      _additional { id }
      ... on ${className} {
        *
      }
    `)
    .withWhere({
      path: [refProperty],
      operator: 'Equal',
      valueText: targetUuid
    })
    .do();

  return result.data?.Get?.[className] || [];
}

export async function createObjectWithReferences(
  className: string,
  data: any,
  references?: Record<string, ReferenceValue>,
  options?: { id?: string; vector?: number[] }
) {
  const weaviateClient = getWeaviateClient();

  let creator = weaviateClient.data
    .creator()
    .withClassName(className)
    .withProperties(data);

  if (options?.id) {
    creator = creator.withId(options.id);
  }

  if (options?.vector) {
    creator = creator.withVector(options.vector);
  }

  const result = await creator.do();

  const objectId = extractObjectId(result, options?.id);
  if (!objectId) {
    throw new Error('Failed to determine Weaviate object ID after creation');
  }

  await applyReferencesToObject(weaviateClient, className, objectId, references);

  return {
    ...result,
    id: objectId
  };
}

export async function updateObjectWithReferences(
  className: string,
  uuid: string,
  data: any,
  references?: Record<string, ReferenceValue>,
  options?: { vector?: number[] }
) {
  const weaviateClient = getWeaviateClient();

  let updater = weaviateClient.data
    .updater()
    .withClassName(className)
    .withId(uuid)
    .withProperties(data);

  if (options?.vector) {
    const maybeUpdater: any = updater;
    if (typeof maybeUpdater.withVector === 'function') {
      updater = maybeUpdater.withVector(options.vector);
    } else {
      console.warn('⚠️ [WEAVIATE] withVector not supported on updater; skipping vector update');
    }
  }

  const result = await updater.do();

  await applyReferencesToObject(weaviateClient, className, uuid, references);

  return result;
}

export async function deleteObjectCascade(className: string, uuid: string) {
  const weaviateClient = getWeaviateClient();

  const referencingObjects = await findReferencingObjects(className, uuid);

  for (const refObj of referencingObjects) {
    await weaviateClient.data
      .deleter()
      .withClassName(refObj.className)
      .withId(refObj.id)
      .do();
  }

  await weaviateClient.data
    .deleter()
    .withClassName(className)
    .withId(uuid)
    .do();
}

async function findReferencingObjects(targetClassName: string, targetUuid: string) {
  const weaviateClient = getWeaviateClient();
  const referencingObjects: Array<{ className: string; id: string }> = [];

  const referenceMap: Record<string, string[]> = {
    ResearchGoal: ['QuestionPlan', 'InterviewSession', 'BatchSummary'],
    QuestionPlan: ['InterviewSession'],
    InterviewSession: ['TranscriptChunk', 'PsychometricProfile', 'BatchSummary', 'Annotation', 'TranscriptDocument'],
    TranscriptChunk: ['Annotation'],
    TranscriptDocument: [],
    PsychometricProfile: [],
    BatchSummary: [],
    Annotation: []
  };

  const referencingClasses = Object.entries(referenceMap)
    .filter(([, targets]) => targets.includes(targetClassName))
    .map(([className]) => className);

  for (const className of referencingClasses) {
    const result = await weaviateClient.graphql
      .get()
      .withClassName(className)
      .withFields(`
        _additional { id }
        ... on ${className} { * }
      `)
      .withWhere({
        path: [referencePropertyForClass(className, targetClassName)],
        operator: 'Equal',
        valueText: targetUuid
      })
      .do();

    const objects = result.data?.Get?.[className] || [];
    for (const obj of objects) {
      const id = obj._additional?.id;
      if (id) {
        referencingObjects.push({ className, id });
      }
    }
  }

  return referencingObjects;
}

function referencePropertyForClass(className: string, targetClassName: string) {
  const referenceMap: Record<string, Record<string, string>> = {
    QuestionPlan: { ResearchGoal: 'researchGoal' },
    InterviewSession: { ResearchGoal: 'researchGoal' },
    TranscriptChunk: { InterviewSession: 'session' },
    TranscriptDocument: { InterviewSession: 'session' },
    Annotation: { InterviewSession: 'session', TranscriptChunk: 'chunk' },
    PsychometricProfile: { InterviewSession: 'session' },
    BatchSummary: { ResearchGoal: 'researchGoal', InterviewSession: 'sessions' }
  };

  return referenceMap[className]?.[targetClassName] || 'session';
}

export async function callWeaviateAPI(action: string, className: string, data: any) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/weaviate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, className, data })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
