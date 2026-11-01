import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';

const projectId = 'demo-vanguard-chess';
const rules = await readFile(new URL('./firestore.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });

try {
  const alice = testEnv.authenticatedContext('alice').firestore();
  const bob = testEnv.authenticatedContext('bob').firestore();
  const anonymous = testEnv.unauthenticatedContext().firestore();
  const starterProfile = {
    uid: 'alice', profileSchemaVersion: 2, displayName: 'Alice', elo: 1200, gamesPlayed: 0,
    activeBackground: 'default'
  };
  const privateStarter = {
    coins: 500, unlockedThemes: ['luxury', 'classic'], unlockedBackgrounds: ['default'],
    isPremium: false, premiumUntil: 0
  };

  await assertFails(setDoc(doc(anonymous, 'users/visitor'), { ...starterProfile, uid: 'visitor' }));
  await assertFails(setDoc(doc(alice, 'serverRateLimits/alice'), { count: 1, resetAt: Date.now() + 60_000 }));
  await assertFails(getDoc(doc(alice, 'serverRateLimits/alice')));
  await assertFails(setDoc(doc(alice, 'users/alice'), { ...starterProfile, coins: 500 }));
  await assertFails(setDoc(doc(alice, 'users/alice'), starterProfile));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice'), starterProfile);
  });
  await assertSucceeds(setDoc(doc(alice, 'userPrivate/alice'), privateStarter));
  await assertSucceeds(getDoc(doc(alice, 'userPrivate/alice')));
  const publicProfileSnapshot = await getDoc(doc(alice, 'users/alice'));
  assert.equal('coins' in publicProfileSnapshot.data(), false, 'Public profile must not expose wallet balance');
  const publicProfiles = await getDocs(query(collection(alice, 'users'), where('profileSchemaVersion', '==', 2)));
  assert.equal(publicProfiles.docs.some((profile) => profile.id === 'legacy-user'), false);
  await assertFails(getDoc(doc(bob, 'userPrivate/alice')));
  await assertFails(getDoc(doc(anonymous, 'userPrivate/alice')));
  await assertFails(updateDoc(doc(alice, 'userPrivate/alice'), { coins: 999999 }));
  await assertFails(deleteDoc(doc(alice, 'userPrivate/alice')));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/legacy-user'), {
      uid: 'legacy-user', displayName: 'Legacy', elo: 1200, gamesPlayed: 0, coins: 800
    });
  });
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext('legacy-user').firestore(), 'users/legacy-user')));
  await assertFails(getDoc(doc(bob, 'users/legacy-user')));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { displayName: 'Alice Updated' }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { coins: 999999 }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { isPremium: true }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { premiumUntil: Date.now() + 86400000 }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { elo: 9999 }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { gamesPlayed: 9999 }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { stats: { wins: 9999 } }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { eloHistory: [{ elo: 9999 }] }));
  await assertFails(updateDoc(doc(bob, 'users/alice'), { displayName: 'Stolen' }));
  await assertFails(deleteDoc(doc(alice, 'users/alice')));

  await assertSucceeds(setDoc(doc(alice, 'queue/alice'), { uid: 'alice', elo: 1200, timeControl: 300 }));
  await assertSucceeds(getDoc(doc(bob, 'queue/alice')));
  await assertFails(getDoc(doc(anonymous, 'queue/alice')));
  await assertFails(deleteDoc(doc(bob, 'queue/alice')));
  await assertSucceeds(deleteDoc(doc(alice, 'queue/alice')));

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'userPrivate/alice'), {
      ...privateStarter, playSuspendedUntil: Date.now() - 60_000
    });
  });
  await assertSucceeds(setDoc(doc(alice, 'queue/alice'), {
    uid: 'alice', elo: 1200, timeControl: 300, createdAt: Date.now()
  }), 'An expired play suspension must allow matchmaking.');
  await assertSucceeds(deleteDoc(doc(alice, 'queue/alice')));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'userPrivate/alice'), {
      ...privateStarter, playSuspendedUntil: Date.now() + 60_000
    });
  });
  await assertFails(setDoc(doc(alice, 'queue/alice'), {
    uid: 'alice', elo: 1200, timeControl: 300, createdAt: Date.now()
  }), 'An active play suspension must block matchmaking.');
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'userPrivate/alice'), {
      ...privateStarter, playSuspendedUntil: Date.now() - 60_000
    });
  });
  await assertFails(updateDoc(doc(alice, 'users/alice'), { activeTheme: 'blue' }));
  await assertFails(updateDoc(doc(alice, 'users/alice'), { activeBackground: 'deep-space' }));
  await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { activeTheme: 'vidro' }));
  await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { activeBackground: 'midnight-blue' }));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'userPrivate/alice'), {
      ...privateStarter, unlockedThemes: ['luxury', 'classic', 'blue'],
      unlockedBackgrounds: ['default', 'deep-space']
    });
  });
  await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { activeTheme: 'blue' }));
  await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { activeBackground: 'deep-space' }));

  const tournament = {
    id: 'blitz-arena', name: 'Blitz Arena 3|0', format: 'round-robin',
    minElo: 1000, maxElo: 2000, prize: '500 Coins', startsAt: Date.now() + 7200000,
    status: 'scheduled', participants: [], managedByServer: true
  };
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'tournaments/blitz-arena'), tournament);
    await setDoc(doc(context.firestore(), 'tournaments/legacy-client-event'), {
      ...tournament, id: 'legacy-client-event', managedByServer: false
    });
    await setDoc(doc(context.firestore(), 'tournaments/master-cup'), {
      ...tournament, id: 'master-cup', minElo: 1500, maxElo: 3000, participants: []
    });
    await setDoc(doc(context.firestore(), 'users/low-rated'), {
      uid: 'low-rated', profileSchemaVersion: 2, displayName: 'Low Rated', elo: 900, gamesPlayed: 0
    });
  });
  await assertFails(setDoc(doc(alice, 'tournaments/fake-event'), tournament));
  const officialTournaments = await getDocs(query(collection(alice, 'tournaments'), where('managedByServer', '==', true)));
  assert.deepEqual(new Set(officialTournaments.docs.map((event) => event.id)), new Set(['blitz-arena', 'master-cup']));
  await assertSucceeds(updateDoc(doc(alice, 'tournaments/blitz-arena'), { participants: ['alice'] }));
  await assertFails(updateDoc(doc(alice, 'tournaments/blitz-arena'), { participants: ['alice', 'alice'] }));
  await assertFails(updateDoc(doc(alice, 'tournaments/blitz-arena'), { prize: '999999 Coins' }));
  await assertFails(updateDoc(doc(bob, 'tournaments/blitz-arena'), { participants: ['alice', 'mallory'] }));
  await assertFails(updateDoc(doc(testEnv.authenticatedContext('low-rated').firestore(), 'tournaments/master-cup'), {
    participants: ['low-rated']
  }));

  await assertFails(setDoc(doc(alice, 'challenges/client-challenge'), {
    challengerId: 'alice', challengedId: 'bob', status: 'pending'
  }));
  await assertFails(setDoc(doc(alice, 'challenges/forged-challenge'), {
    challengerId: 'alice', challengedId: 'bob', challengerName: 'Impersonated', challengerElo: 9999,
    status: 'pending', createdAt: Date.now()
  }));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'challenges/challenge-1'), {
      challengerId: 'alice', challengedId: 'bob', challengerName: 'Alice', challengerElo: 1200,
      status: 'pending', createdAt: Date.now()
    });
  });
  await assertFails(getDoc(doc(testEnv.authenticatedContext('mallory').firestore(), 'challenges/challenge-1')));
  await assertFails(updateDoc(doc(bob, 'challenges/challenge-1'), { status: 'accepted' }));
  await assertSucceeds(updateDoc(doc(bob, 'challenges/challenge-1'), { status: 'declined' }));

  const game = {
    whiteId: 'alice', blackId: 'bob', status: 'playing', fen: 'start', pgn: '', turn: 'w',
    lastMoveAt: Date.now(), timeControl: 300, whiteTime: 300, blackTime: 300
  };
  await assertFails(setDoc(doc(alice, 'games/client-created'), game));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'games/server-created'), game);
  });
  await assertSucceeds(getDoc(doc(bob, 'games/server-created')));
  await assertFails(getDoc(doc(testEnv.authenticatedContext('mallory').firestore(), 'games/server-created')));
  await assertFails(getDoc(doc(anonymous, 'games/server-created')));
  await assertFails(updateDoc(doc(alice, 'games/server-created'), { status: 'white_won' }));
  await assertFails(deleteDoc(doc(alice, 'games/server-created')));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'games/public-game'), {
      ...game, status: 'playing', spectatorsAllowedWhite: true, spectatorsAllowedBlack: true
    });
    await setDoc(doc(context.firestore(), 'games/private-invite'), {
      ...game, blackId: null, status: 'waiting_friend',
      spectatorsAllowedWhite: true, spectatorsAllowedBlack: true
    });
  });
  await assertSucceeds(getDoc(doc(anonymous, 'games/public-game')));
  const publicGames = await getDocs(query(
    collection(anonymous, 'games'),
    where('status', '==', 'playing'),
    where('spectatorsAllowedWhite', '==', true),
    where('spectatorsAllowedBlack', '==', true)
  ));
  assert.deepEqual(publicGames.docs.map((snapshot) => snapshot.id), ['public-game']);
  await assertFails(getDoc(doc(anonymous, 'games/private-invite')));
  await assertFails(getDoc(doc(testEnv.authenticatedContext('mallory').firestore(), 'games/private-invite')));
  await assertSucceeds(getDoc(doc(alice, 'games/private-invite')));

  await assertFails(getDoc(doc(anonymous, 'processedPayments/123')));
  await assertFails(setDoc(doc(alice, 'reports/arbitrary'), {
    reporterId: 'alice', targetId: 'bob', reason: 'spam', payload: 'unvalidated'
  }));
  await assertFails(setDoc(doc(alice, 'messages/client-created'), {
    roomId: 'game_sample', uid: 'alice', displayName: 'Alice', text: 'hello', createdAt: Date.now()
  }));
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'messages/alice-message'), {
      roomId: 'game_server-created', uid: 'alice', displayName: 'Alice', text: 'private move', createdAt: Date.now()
    });
    await setDoc(doc(context.firestore(), 'messages/bob-message'), {
      roomId: 'game_server-created', uid: 'bob', displayName: 'Bob', text: 'your turn', createdAt: Date.now()
    });
    await setDoc(doc(context.firestore(), 'messages/invalid-room'), {
      roomId: 'global', uid: 'alice', displayName: 'Alice', text: 'wrong room', createdAt: Date.now()
    });
    await setDoc(doc(context.firestore(), 'globalChat/public-message'), {
      uid: 'alice', displayName: 'Alice', text: 'public chat', createdAt: Date.now()
    });
  });
  await assertSucceeds(getDoc(doc(alice, 'messages/alice-message')));
  await assertSucceeds(getDoc(doc(bob, 'messages/alice-message')));
  await assertFails(getDoc(doc(testEnv.authenticatedContext('mallory').firestore(), 'messages/alice-message')));
  await assertFails(getDoc(doc(anonymous, 'messages/alice-message')));
  await assertFails(getDoc(doc(alice, 'messages/invalid-room')));
  await assertSucceeds(getDocs(query(collection(alice, 'messages'), where('roomId', '==', 'game_server-created'))));
  await assertFails(getDocs(query(
    collection(testEnv.authenticatedContext('mallory').firestore(), 'messages'),
    where('roomId', '==', 'game_server-created')
  )));
  await assertSucceeds(getDoc(doc(anonymous, 'globalChat/public-message')));
  await testEnv.withSecurityRulesDisabled(async context => {
    for (const [id, w, b, mode] of [['bot-public',true,true,'computer'],['bot-private',false,false,'computer'],['online-one-veto',true,false,'online'],['online-public',true,true,'online']]) {
      await setDoc(doc(context.firestore(), 'games/' + id), { whiteId:'alice', blackId: mode === 'computer' ? 'computer' : 'bob', status:'playing', mode, spectatorsAllowedWhite:w, spectatorsAllowedBlack:b });
    }
  });
  await assertSucceeds(getDoc(doc(anonymous,'games/bot-public')));
  // Verify the actual real-time path used by a second, unauthenticated viewer.
  let stopViewer;
  const receivedMove = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stopViewer?.(); reject(new Error('Viewer did not receive the move within 10 seconds')); }, 10000);
    stopViewer = onSnapshot(doc(anonymous, 'games/bot-public'), snapshot => {
      if (snapshot.data()?.pgn === '1. e4') { clearTimeout(timer); stopViewer(); resolve(true); }
    }, error => { clearTimeout(timer); reject(error); });
  });
  await testEnv.withSecurityRulesDisabled(async context => { await updateDoc(doc(context.firestore(),'games/bot-public'),{pgn:'1. e4'}); });
  await receivedMove;
  await assertSucceeds(getDoc(doc(anonymous,'games/online-public')));
  await assertFails(getDoc(doc(anonymous,'games/bot-private')));
  await assertFails(getDoc(doc(bob,'games/bot-private')));
  await assertSucceeds(getDoc(doc(alice,'games/bot-private')));
  await assertFails(getDoc(doc(anonymous,'games/online-one-veto')));
  await assertSucceeds(getDoc(doc(bob,'games/online-one-veto')));
  await assertFails(updateDoc(doc(bob,'games/bot-public'),{pgn:'e4'}));
  await testEnv.withSecurityRulesDisabled(async context => { await updateDoc(doc(context.firestore(),'games/bot-public'),{spectatorsAllowedWhite:false}); });
  await assertFails(getDoc(doc(anonymous,'games/bot-public')));
  console.log('Firestore rules: PASS (private chat, public computer/online spectators, live moves, private-game denial, owner-only writes and privacy revocation).');
} finally {
  await testEnv.cleanup();
}
