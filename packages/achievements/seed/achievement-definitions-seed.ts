/**
 * Seed data for MVP achievement definitions.
 *
 * Run this once when setting up the achievements module to populate
 * the 6-8 default achievement definitions.
 *
 * Usage: call createSeedDefinitions() from your infrastructure seeder.
 */
import type { CreateAchievementDefinitionInputDTO } from '../application/dtos/create-achievement-definition-dto.js';

export const ACHIEVEMENT_SEED_DEFINITIONS: CreateAchievementDefinitionInputDTO[] = [
  // ── Workout-based ─────────────────────────────────────────────────────────
  {
    code: 'FIRST_WORKOUT',
    name: 'Primeiro Treino',
    description: 'Complete seu primeiro treino. A jornada começa agora!',
    category: 'WORKOUT',
    tier: 'BRONZE',
    metricType: 'workout_count',
    operator: '>=',
    targetValue: 1,
    iconUrl: 'https://cdn.fittrack.com/achievements/first-workout.png',
    isRepeatable: false,
  },
  {
    code: 'TEN_WORKOUTS',
    name: 'Dez Treinos',
    description: 'Complete 10 treinos. Você está desenvolvendo um ótimo hábito!',
    category: 'WORKOUT',
    tier: 'BRONZE',
    metricType: 'workout_count',
    operator: '>=',
    targetValue: 10,
    iconUrl: 'https://cdn.fittrack.com/achievements/ten-workouts.png',
    isRepeatable: false,
  },
  {
    code: 'FIFTY_WORKOUTS',
    name: 'Cinquenta Treinos',
    description: 'Complete 50 treinos. Meio centenário de dedicação!',
    category: 'WORKOUT',
    tier: 'SILVER',
    metricType: 'workout_count',
    operator: '>=',
    targetValue: 50,
    iconUrl: 'https://cdn.fittrack.com/achievements/fifty-workouts.png',
    isRepeatable: false,
  },
  {
    code: 'HUNDRED_WORKOUTS',
    name: 'Guerreiro dos Treinos',
    description: 'Complete 100 treinos. Você é um verdadeiro guerreiro!',
    category: 'WORKOUT',
    tier: 'GOLD',
    metricType: 'workout_count',
    operator: '>=',
    targetValue: 100,
    iconUrl: 'https://cdn.fittrack.com/achievements/hundred-workouts.png',
    isRepeatable: false,
  },

  // ── Streak-based ──────────────────────────────────────────────────────────
  {
    code: 'STREAK_7_DAYS',
    name: 'Semana Consistente',
    description: 'Mantenha um streak de 7 dias consecutivos de treino.',
    category: 'STREAK',
    tier: 'BRONZE',
    metricType: 'streak_days',
    operator: '>=',
    targetValue: 7,
    iconUrl: 'https://cdn.fittrack.com/achievements/streak-7.png',
    isRepeatable: false,
  },
  {
    code: 'STREAK_30_DAYS',
    name: 'Mês de Fogo',
    description: 'Mantenha um streak de 30 dias consecutivos. Imparável!',
    category: 'STREAK',
    tier: 'GOLD',
    metricType: 'streak_days',
    operator: '>=',
    targetValue: 30,
    iconUrl: 'https://cdn.fittrack.com/achievements/streak-30.png',
    isRepeatable: false,
  },

  // ── Milestone-based ───────────────────────────────────────────────────────
  {
    code: 'DAYS_30_USER',
    name: 'Um Mês na Plataforma',
    description: '30 dias desde que você entrou para o FitTrack. Parabéns!',
    category: 'MILESTONE',
    tier: 'BRONZE',
    metricType: 'user_age_days',
    operator: '>=',
    targetValue: 30,
    iconUrl: 'https://cdn.fittrack.com/achievements/30-days-user.png',
    isRepeatable: false,
  },
  {
    code: 'MONTHS_6_USER',
    name: 'Seis Meses de Dedicação',
    description: '6 meses na plataforma. Você está comprometido com sua saúde!',
    category: 'MILESTONE',
    tier: 'SILVER',
    metricType: 'user_age_days',
    operator: '>=',
    targetValue: 180,
    iconUrl: 'https://cdn.fittrack.com/achievements/6-months-user.png',
    isRepeatable: false,
  },
  {
    code: 'YEAR_1_USER',
    name: 'Aniversário FitTrack',
    description: '1 ano na plataforma! Você transformou sua vida. Feliz aniversário!',
    category: 'MILESTONE',
    tier: 'GOLD',
    metricType: 'user_age_days',
    operator: '>=',
    targetValue: 365,
    iconUrl: 'https://cdn.fittrack.com/achievements/1-year-user.png',
    isRepeatable: false,
  },
];
