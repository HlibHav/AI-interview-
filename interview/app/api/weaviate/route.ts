import { NextRequest, NextResponse } from 'next/server';
import { schemaClasses } from '@/lib/weaviate/weaviate-schema';
import {
  createObjectWithReferences,
  getWeaviateClient
} from '@/lib/weaviate/weaviate-helpers';

let client: any;
try {
  client = getWeaviateClient();
  console.log('✅ [WEAVIATE] Client ready');
} catch (error) {
  console.error('❌ [WEAVIATE] Failed to initialize client:', error);
}

export async function POST(request: NextRequest) {
  try {
    const { action, data, className } = await request.json();

    switch (action) {
      case 'test_connection':
        return handleTestConnection();
      case 'create_schema':
        await createSchema();
        return NextResponse.json({ success: true, message: 'Schema created successfully' });
      case 'store':
        return NextResponse.json({ success: true, id: (await storeData(className, data)).id });
      case 'search':
        return NextResponse.json({ success: true, results: await searchData(className, data) });
      case 'get_by_id':
        return NextResponse.json({ success: true, object: await getObjectById(className, data.id) });
      case 'update_by_id':
        return NextResponse.json({
          success: true,
          result: await updateObjectById(className, data.id, data.updates)
        });
      case 'create_with_references':
        return NextResponse.json({
          success: true,
          id: (await createObjectWithReferences(className, data.properties, data.references)).id
        });
      case 'query_by_reference':
        return NextResponse.json({
          success: true,
          results: await queryByReference(className, data.refProperty, data.targetId)
        });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Weaviate operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Weaviate operation' },
      { status: 500 }
    );
  }
}

function ensureClient() {
  if (!client) {
    client = getWeaviateClient();
  }
  return client;
}

function handleTestConnection() {
  try {
    ensureClient();
    const weaviateHost = process.env.WEAVIATE_HOST || 'localhost:8081';
    return NextResponse.json({
      success: true,
      message: 'Client initialized',
      host: weaviateHost,
      clientExists: true
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: 'Weaviate client not initialized' },
      { status: 500 }
    );
  }
}

async function createSchema() {
  const weaviateClient = ensureClient();

  const existingSchema = await weaviateClient.schema.getter().do();
  const existingClasses = existingSchema.classes || [];
  const existingClassNames = existingClasses.map((c: any) => c.class);

  for (const schemaClass of schemaClasses) {
    const existingClass = existingClasses.find(
      (cls: any) => cls.class === schemaClass.class
    );

    if (!existingClassNames.includes(schemaClass.class)) {
      const classWithoutRefs = {
        class: schemaClass.class,
        description: schemaClass.description,
        properties: schemaClass.properties
      };

      await weaviateClient.schema.classCreator().withClass(classWithoutRefs).do();
      console.log(`✅ Created class: ${schemaClass.class}`);

      if (schemaClass.references?.length) {
        for (const ref of schemaClass.references) {
          try {
            await weaviateClient.schema
              .propertyCreator()
              .withClassName(schemaClass.class)
              .withProperty({
                name: ref.name,
                dataType: [ref.targetClass]
              })
              .do();
            console.log(`✅ Added reference ${ref.name} -> ${ref.targetClass} to ${schemaClass.class}`);
          } catch (refError) {
            console.warn(
              `⚠️ Failed to add reference ${ref.name} to ${schemaClass.class}:`,
              refError
            );
          }
        }
      }
    } else {
      console.log(`ℹ️ Class ${schemaClass.class} already exists`);

      const existingPropertyNames = new Set(
        (existingClass?.properties || []).map((prop: any) => prop.name)
      );

      for (const property of schemaClass.properties) {
        if (existingPropertyNames.has(property.name)) {
          continue;
        }

        try {
          await weaviateClient.schema
            .propertyCreator()
            .withClassName(schemaClass.class)
            .withProperty(property)
            .do();
          existingPropertyNames.add(property.name);
          console.log(
            `✅ Added missing property ${property.name} to ${schemaClass.class}`
          );
        } catch (propertyError) {
          console.warn(
            `⚠️ Failed to add property ${property.name} to ${schemaClass.class}:`,
            propertyError
          );
        }
      }

      if (schemaClass.references?.length) {
        for (const ref of schemaClass.references) {
          if (existingPropertyNames.has(ref.name)) {
            continue;
          }

          try {
            await weaviateClient.schema
              .propertyCreator()
              .withClassName(schemaClass.class)
              .withProperty({
                name: ref.name,
                dataType: [ref.targetClass]
              })
              .do();
            existingPropertyNames.add(ref.name);
            console.log(
              `✅ Added missing reference ${ref.name} -> ${ref.targetClass} on ${schemaClass.class}`
            );
          } catch (refError) {
            console.warn(
              `⚠️ Failed to add reference ${ref.name} to ${schemaClass.class}:`,
              refError
            );
          }
        }
      }
    }
  }
}

async function storeData(className: string, data: any) {
  const weaviateClient = ensureClient();
  return weaviateClient.data.creator().withClassName(className).withProperties(data).do();
}

async function searchData(className: string, searchParams: any) {
  const weaviateClient = ensureClient();
  const params = searchParams || { query: '', limit: 10 };
  const { query, limit = 10, nearText } = params;

  let searchBuilder = weaviateClient.graphql
    .get()
    .withClassName(className)
    .withFields('_additional { id } ... on ' + className + ' { * }')
    .withLimit(limit);

  if (query) {
    searchBuilder = searchBuilder.withNearText({
      concepts: [query],
      certainty: 0.7
    });
  }

  if (nearText) {
    searchBuilder = searchBuilder.withNearText({
      concepts: Array.isArray(nearText) ? nearText : [nearText],
      certainty: 0.7
    });
  }

  const result = await searchBuilder.do();
  return result.data.Get[className] || [];
}

async function getObjectById(className: string, id: string) {
  const weaviateClient = ensureClient();
  return weaviateClient.data.getterById().withClassName(className).withId(id).do();
}

async function updateObjectById(className: string, id: string, updates: any) {
  const weaviateClient = ensureClient();
  return weaviateClient.data
    .updater()
    .withClassName(className)
    .withId(id)
    .withProperties(updates)
    .do();
}

async function queryByReference(className: string, refProperty: string, targetId: string) {
  const weaviateClient = ensureClient();

  const result = await weaviateClient.graphql
    .get()
    .withClassName(className)
    .withFields('_additional { id } ... on ' + className + ' { * }')
    .withWhere({
      path: [refProperty],
      operator: 'Equal',
      valueText: targetId
    })
    .do();

  return result.data.Get[className] || [];
}
