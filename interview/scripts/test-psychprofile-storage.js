#!/usr/bin/env node

/**
 * Test script to verify PsychProfile storage in Weaviate
 * 
 * Usage:
 *   node scripts/test-psychprofile-storage.js [sessionId]
 * 
 * If sessionId is provided, it will check that specific session.
 * Otherwise, it will show all PsychProfile objects.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testPsychProfileStorage(sessionId = null) {
  console.log('🧪 Testing PsychProfile storage in Weaviate...\n');

  try {
    const url = sessionId 
      ? `${BASE_URL}/api/weaviate/verify-psychprofile?sessionId=${sessionId}`
      : `${BASE_URL}/api/weaviate/verify-psychprofile`;

    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Response received successfully\n');
    console.log('📊 Results:');
    console.log(`   Total PsychProfile objects: ${data.totalPsychProfiles || data.count || 0}`);
    
    if (sessionId) {
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   Found: ${data.found ? 'Yes' : 'No'}`);
    } else {
      console.log(`   Filtered profiles: ${data.filteredProfiles || 0}`);
      console.log(`   Profiles with session reference: ${data.summary?.profilesWithSessionReference || 0}`);
      console.log(`   Profiles without session reference: ${data.summary?.profilesWithoutSessionReference || 0}`);
    }

    if (data.profiles && data.profiles.length > 0) {
      console.log('\n📋 Profile Details:');
      data.profiles.forEach((profile, index) => {
        console.log(`\n   Profile ${index + 1}:`);
        console.log(`     PsychProfile ID: ${profile.psychProfileId}`);
        console.log(`     Session ID: ${profile.sessionId}`);
        console.log(`     Scores:`);
        console.log(`       Openness: ${profile.scores.openness}`);
        console.log(`       Conscientiousness: ${profile.scores.conscientiousness}`);
        console.log(`       Extraversion: ${profile.scores.extraversion}`);
        console.log(`       Agreeableness: ${profile.scores.agreeableness}`);
        console.log(`       Neuroticism: ${profile.scores.neuroticism}`);
        console.log(`       Enneagram Type: ${profile.scores.enneagramType}`);
        console.log(`     Created: ${profile.createdAt}`);
        console.log(`     Session Reference: ${profile.sessionReference ? 'Yes' : 'No'}`);
        
        if (profile.sessionReference) {
          console.log(`       Session Weaviate ID: ${profile.sessionReference.sessionWeaviateId}`);
          console.log(`       Research Goal: ${profile.sessionReference.researchGoal}`);
          console.log(`       Status: ${profile.sessionReference.status}`);
        }
      });
    } else {
      console.log('\n❌ No PsychProfile objects found');
      if (sessionId) {
        console.log('   This suggests the PsychProfile was not created for this session.');
        console.log('   Check the logs for any errors during session completion.');
      }
    }

    if (data.summary?.averageScores) {
      console.log('\n📈 Average Scores Across All Profiles:');
      const avg = data.summary.averageScores;
      console.log(`   Openness: ${avg.openness.toFixed(1)}`);
      console.log(`   Conscientiousness: ${avg.conscientiousness.toFixed(1)}`);
      console.log(`   Extraversion: ${avg.extraversion.toFixed(1)}`);
      console.log(`   Agreeableness: ${avg.agreeableness.toFixed(1)}`);
      console.log(`   Neuroticism: ${avg.neuroticism.toFixed(1)}`);
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure the Next.js server is running');
    console.error('2. Check that Weaviate is running and accessible');
    console.error('3. Verify the API endpoint is working');
    console.error('4. Check server logs for any errors');
    process.exit(1);
  }
}

// Get sessionId from command line arguments
const sessionId = process.argv[2];

console.log('🧠 PsychProfile Storage Test');
console.log('============================\n');

if (sessionId) {
  console.log(`Testing specific session: ${sessionId}\n`);
} else {
  console.log('Testing all PsychProfile objects\n');
}

testPsychProfileStorage(sessionId);

