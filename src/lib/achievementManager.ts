import { UserData } from '../types';
import { ACHIEVEMENTS } from './achievements';
import { arrayUnion } from 'firebase/firestore';

export function calculateAchievements(
  userData: UserData,
  gameResult: 1 | 0.5 | 0, 
  totalMoves: number, // plies
  isBotGame: boolean = false,
  botDifficulty?: string
) {
  const earnedBadges = userData.achievements || [];
  const newBadges: string[] = [];
  let currentStreak = userData.currentWinStreak || 0;
  
  if (gameResult === 1) {
    currentStreak += 1;
  } else {
    currentStreak = 0;
  }

  const totalGames = (userData.gamesPlayed || 0) + 1;
  const totalWins = (userData.stats?.wins || 0) + (gameResult === 1 ? 1 : 0);

  if (gameResult === 1 && totalWins === 1 && !earnedBadges.includes('first_win')) {
    newBadges.push('first_win');
  }
  if (currentStreak >= 3 && !earnedBadges.includes('streak_3')) {
    newBadges.push('streak_3');
  }
  if (currentStreak >= 5 && !earnedBadges.includes('streak_5')) {
    newBadges.push('streak_5');
  }
  if (gameResult === 1 && totalMoves > 100 && !earnedBadges.includes('endgame_master')) {
    newBadges.push('endgame_master');
  }
  if (gameResult === 1 && totalMoves < 40 && !earnedBadges.includes('tactician')) {
    newBadges.push('tactician');
  }
  if (gameResult === 1 && isBotGame && botDifficulty === 'profissional' && !earnedBadges.includes('bot_slayer')) {
    newBadges.push('bot_slayer');
  }
  if (totalGames >= 50 && !earnedBadges.includes('veteran')) {
    newBadges.push('veteran');
  }

  const updates: any = {
    currentWinStreak: currentStreak
  };

  if (newBadges.length > 0) {
    updates.achievements = arrayUnion(...newBadges);
  }

  return { updates, newBadges };
}
