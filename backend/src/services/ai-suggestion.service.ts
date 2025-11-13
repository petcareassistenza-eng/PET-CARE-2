import { getDb } from '../utils/firebaseAdmin';
/**
 * AI Suggestion Engine - Smart PRO Matching
 * 
 * Uses intelligent scoring algorithm to match users with best PROs
 * Based on:
 * - Geographic distance
 * - Review ratings
 * - Service availability
 * - Price compatibility
 * - User booking history
 * - Pet compatibility
 */

import admin from 'firebase-admin';

import { logger } from '../logger';

const db = getDb();

interface ProSuggestion {
  proId: string;
  displayName: string;
  rating: number;
  reviewCount: number;
  distance: number;
  price: number;
  services: string[];
  score: number;
  matchReasons: string[];
}

/**
 * Calculate geographic distance between two points (Haversine formula)
 * 
 * @param lat1 - User latitude
 * @param lng1 - User longitude
 * @param lat2 - PRO latitude
 * @param lng2 - PRO longitude
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate affinity score between user and PRO
 * 
 * @param pro - PRO document data
 * @param userLat - User latitude
 * @param userLng - User longitude
 * @param userPets - User's pet types
 * @param userHistory - User's booking history
 * @returns Affinity score (0-100)
 */
function calculateAffinityScore(
  pro: any,
  userLat: number,
  userLng: number,
  userPets: string[],
  userHistory: any[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Distance Score (40 points max)
  const distance = calculateDistance(
    userLat,
    userLng,
    pro.geo?.lat || 0,
    pro.geo?.lng || 0
  );

  if (distance <= 5) {
    score += 40;
    reasons.push('Molto vicino (< 5km)');
  } else if (distance <= 10) {
    score += 30;
    reasons.push('Vicino (< 10km)');
  } else if (distance <= 20) {
    score += 20;
    reasons.push('Raggiungibile (< 20km)');
  } else {
    score += 10;
  }

  // 2. Rating Score (30 points max)
  const rating = pro.rating || 0;
  const reviewCount = pro.reviewCount || 0;

  if (rating >= 4.5 && reviewCount >= 10) {
    score += 30;
    reasons.push('Recensioni eccellenti');
  } else if (rating >= 4.0 && reviewCount >= 5) {
    score += 25;
    reasons.push('Buone recensioni');
  } else if (rating >= 3.5) {
    score += 15;
  } else {
    score += 5;
  }

  // 3. Pet Compatibility (15 points max)
  const proServices = pro.services || [];
  const compatiblePets = userPets.filter((pet: string) =>
    proServices.some((s: any) => 
      s.name?.toLowerCase().includes(pet.toLowerCase())
    )
  );

  if (compatiblePets.length >= 2) {
    score += 15;
    reasons.push('Specializzato nei tuoi animali');
  } else if (compatiblePets.length === 1) {
    score += 10;
  }

  // 4. Price Compatibility (10 points max)
  const avgPrice = proServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0) / proServices.length || 0;

  if (avgPrice <= 40) {
    score += 10;
    reasons.push('Prezzo competitivo');
  } else if (avgPrice <= 60) {
    score += 7;
  } else {
    score += 3;
  }

  // 5. Availability Score (5 points max)
  if (pro.active === true && pro.subscriptionStatus === 'active') {
    score += 5;
    reasons.push('Disponibile ora');
  }

  return { score, reasons };
}

/**
 * Get personalized PRO suggestions for a user
 * 
 * @param userId - User document ID
 * @param limit - Maximum number of suggestions (default: 5)
 * @returns Array of PRO suggestions with scores
 */
export async function getSuggestionsForUser(userId: string, limit: number = 5): Promise<ProSuggestion[]> {
  try {
    logger.info({ userId }, 'Generating PRO suggestions');

    // Get user data
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }

    const user = userDoc.data()!;
    const userLat = user.location?.lat || 41.9028; // Default: Rome
    const userLng = user.location?.lng || 12.4964;
    const userPets = user.pets?.map((p: any) => p.type) || [];

    // Get user booking history
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const userHistory = bookingsSnapshot.docs.map(doc => doc.data());

    // Get all active PROs
    const prosSnapshot = await db
      .collection('pros')
      .where('active', '==', true)
      .where('subscriptionStatus', '==', 'active')
      .get();

    if (prosSnapshot.empty) {
      logger.warn('No active PROs found');
      return [];
    }

    // Calculate affinity scores
    const suggestions: ProSuggestion[] = [];

    for (const proDoc of prosSnapshot.docs) {
      const pro = proDoc.data();
      const proId = proDoc.id;

      const { score, reasons } = calculateAffinityScore(
        pro,
        userLat,
        userLng,
        userPets,
        userHistory
      );

      const distance = calculateDistance(
        userLat,
        userLng,
        pro.geo?.lat || 0,
        pro.geo?.lng || 0
      );

      const services = (pro.services || []).map((s: any) => s.name);
      const avgPrice = (pro.services || []).reduce((sum: number, s: any) => sum + (s.price || 0), 0) / (pro.services || []).length || 0;

      suggestions.push({
        proId,
        displayName: pro.displayName || 'Professionista',
        rating: pro.rating || 0,
        reviewCount: pro.reviewCount || 0,
        distance: Math.round(distance * 10) / 10,
        price: Math.round(avgPrice),
        services,
        score,
        matchReasons: reasons,
      });
    }

    // Sort by score (descending) and limit results
    const topSuggestions = suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    logger.info({ userId, count: topSuggestions.length }, 'PRO suggestions generated');

    return topSuggestions;

  } catch (error) {
    logger.error({ error, userId }, 'Error generating PRO suggestions');
    throw error;
  }
}

/**
 * Get similar PROs (for recommendations on PRO detail page)
 * 
 * @param proId - Current PRO document ID
 * @param limit - Maximum number of suggestions (default: 3)
 * @returns Array of similar PROs
 */
export async function getSimilarPros(proId: string, limit: number = 3): Promise<ProSuggestion[]> {
  try {
    logger.info({ proId }, 'Finding similar PROs');

    // Get current PRO data
    const proDoc = await db.doc(`pros/${proId}`).get();
    if (!proDoc.exists) {
      throw new Error(`PRO ${proId} not found`);
    }

    const currentPro = proDoc.data()!;
    const currentLat = currentPro.geo?.lat || 0;
    const currentLng = currentPro.geo?.lng || 0;
    const currentServices = (currentPro.services || []).map((s: any) => s.name.toLowerCase());
    const currentAvgPrice = (currentPro.services || []).reduce((sum: number, s: any) => sum + (s.price || 0), 0) / (currentPro.services || []).length || 0;

    // Find similar PROs
    const prosSnapshot = await db
      .collection('pros')
      .where('active', '==', true)
      .where('subscriptionStatus', '==', 'active')
      .get();

    const similarPros: ProSuggestion[] = [];

    for (const doc of prosSnapshot.docs) {
      if (doc.id === proId) continue; // Skip current PRO

      const pro = doc.data();
      const distance = calculateDistance(
        currentLat,
        currentLng,
        pro.geo?.lat || 0,
        pro.geo?.lng || 0
      );

      // Similarity score calculation
      let similarityScore = 0;
      const reasons: string[] = [];

      // 1. Service similarity (40 points)
      const proServices = (pro.services || []).map((s: any) => s.name.toLowerCase());
      const commonServices = currentServices.filter((s: string) => proServices.includes(s));
      
      if (commonServices.length >= 2) {
        similarityScore += 40;
        reasons.push('Servizi simili');
      } else if (commonServices.length === 1) {
        similarityScore += 20;
      }

      // 2. Price similarity (30 points)
      const proAvgPrice = (pro.services || []).reduce((sum: number, s: any) => sum + (s.price || 0), 0) / (pro.services || []).length || 0;
      const priceDiff = Math.abs(proAvgPrice - currentAvgPrice);
      
      if (priceDiff <= 10) {
        similarityScore += 30;
        reasons.push('Prezzo simile');
      } else if (priceDiff <= 20) {
        similarityScore += 20;
      } else {
        similarityScore += 10;
      }

      // 3. Geographic proximity (20 points)
      if (distance <= 5) {
        similarityScore += 20;
        reasons.push('Nella stessa zona');
      } else if (distance <= 10) {
        similarityScore += 15;
      } else if (distance <= 20) {
        similarityScore += 10;
      }

      // 4. Rating similarity (10 points)
      const ratingDiff = Math.abs((pro.rating || 0) - (currentPro.rating || 0));
      if (ratingDiff <= 0.5) {
        similarityScore += 10;
        reasons.push('Valutazione simile');
      } else if (ratingDiff <= 1.0) {
        similarityScore += 5;
      }

      similarPros.push({
        proId: doc.id,
        displayName: pro.displayName || 'Professionista',
        rating: pro.rating || 0,
        reviewCount: pro.reviewCount || 0,
        distance: Math.round(distance * 10) / 10,
        price: Math.round(proAvgPrice),
        services: proServices,
        score: similarityScore,
        matchReasons: reasons,
      });
    }

    // Sort by similarity score and limit
    const topSimilar = similarPros
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    logger.info({ proId, count: topSimilar.length }, 'Similar PROs found');

    return topSimilar;

  } catch (error) {
    logger.error({ error, proId }, 'Error finding similar PROs');
    throw error;
  }
}

/**
 * Record user feedback on suggestions (for ML improvement)
 * 
 * @param userId - User document ID
 * @param proId - PRO document ID
 * @param action - User action ('viewed', 'booked', 'dismissed')
 */
export async function recordSuggestionFeedback(
  userId: string,
  proId: string,
  action: 'viewed' | 'booked' | 'dismissed'
): Promise<void> {
  try {
    await db.collection('suggestion_feedback').add({
      userId,
      proId,
      action,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info({ userId, proId, action }, 'Suggestion feedback recorded');
  } catch (error) {
    logger.error({ error, userId, proId }, 'Error recording feedback');
  }
}
