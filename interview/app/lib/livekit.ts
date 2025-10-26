// lib/livekit.ts
import type { Room, RemoteParticipant } from 'livekit-client';
import { RoomEvent } from 'livekit-client';

export async function connectLiveKit(url: string, roomName: string, identity: string): Promise<Room> {
  // fetch a user token from your server (do NOT mint in the browser)
  const tokenRes = await fetch(`/api/livekit-token?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(identity)}`);
  if (!tokenRes.ok) throw new Error(`Token mint failed: ${tokenRes.status}`);
  const { token } = await tokenRes.json();

  const { Room: LKRoom } = await import('livekit-client');
  const room = new LKRoom();
  await room.connect(url, token, { autoSubscribe: true });
  return room;
}

export async function waitForAgent(
  room: Room,
  { identityPrefix = 'bey-agent-', timeoutMs = 30000 } = {}
): Promise<RemoteParticipant> {
  const t0 = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const elapsed = Date.now() - t0;
      
      // Check if room is available
      if (!room) {
        console.log(`Room not available yet (${elapsed}ms elapsed), waiting...`);
        return;
      }
      
      // Check if room is connected and participants are available
      if (room.state !== 'connected' || !room.remoteParticipants) {
        console.log(`Room not ready yet (${elapsed}ms elapsed), state: ${room.state}, participants: ${room.remoteParticipants?.size || 0}`);
        return;
      }

      const participants = Array.from(room.remoteParticipants.values());
      console.log(`Checking ${participants.length} participants for agent with prefix '${identityPrefix}' (${elapsed}ms elapsed)`);
      
      // Log all participants for debugging
      participants.forEach(p => {
        const videoTracks = [...p.videoTrackPublications.values()];
        const audioTracks = [...p.audioTrackPublications.values()];
        const subscribedVideo = videoTracks.filter(t => t.isSubscribed || t.track).length;
        const subscribedAudio = audioTracks.filter(t => t.isSubscribed || t.track).length;
        console.log(`  Participant: "${p.identity}", videoTracks: ${videoTracks.length} (${subscribedVideo} subscribed), audioTracks: ${audioTracks.length} (${subscribedAudio} subscribed)`);
      });

      // Try multiple possible agent identity patterns
      const possiblePrefixes = [
        identityPrefix, // 'bey-agent-'
        'bp-session-',  // Our token identity
        'agent-',       // Generic agent
        'bey-',         // Beyond Presence
        'avatar-',      // Avatar-based
      ];

      // find agent participant - accept as soon as found, don't wait for tracks
      for (const p of participants) {
        for (const prefix of possiblePrefixes) {
          if (p.identity?.startsWith(prefix)) {
            console.log(`Found agent "${p.identity}" with prefix "${prefix}" - accepting immediately`);
            cleanup();
            return resolve(p);
          }
        }
      }

      // If no agent found with prefixes, check if there's any participant
      // (in case BP uses a completely different naming convention)
      if (participants.length > 0) {
        const p = participants[0];
        console.log(`Found participant "${p.identity}" - treating as agent`);
        cleanup();
        return resolve(p);
      }
      
      if (elapsed > timeoutMs) {
        cleanup();
        const errorMsg = `Agent with prefix '${identityPrefix}' not found within ${timeoutMs}ms timeout. Room state: ${room.state}, Participants: ${participants.length}`;
        console.error(errorMsg);
        console.error('Available participants:', participants.map(p => `"${p.identity}"`));
        return reject(new Error(errorMsg));
      }
    };

    const onPub = () => check();
    const onJoin = () => check();

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.TrackSubscribed, onPub);
    room.on(RoomEvent.TrackPublished, onPub);

    // Set up periodic checks in case room isn't ready initially
    const interval = setInterval(check, 500);

    const cleanup = () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.TrackSubscribed, onPub);
      room.off(RoomEvent.TrackPublished, onPub);
      clearInterval(interval);
    };

    // Initial check
    check();
  });
}

export async function hardDisconnect(room?: Room) {
  if (!room) return;
  try { 
    await room.disconnect(); 
  } catch (error) {
    console.warn('Error during room disconnect:', error);
  }
}
