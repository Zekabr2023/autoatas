
import { TokenUsage } from '../types';

const HISTORY_KEY = 'autoAtasTokenUsageHistory';

export function getTokenHistory(): TokenUsage[] {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to parse token history from localStorage", error);
    return [];
  }
}

export function addTokenUsage(newUsage: TokenUsage) {
  const history = getTokenHistory();
  history.push(newUsage);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save token history to localStorage", error);
  }
}

export function clearTokenHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear token history from localStorage", error);
  }
}

export function updateTokenUsageCondo(sessionId: string, condoName: string) {
  const history = getTokenHistory();
  let updated = false;
  const newHistory = history.map(usage => {
    if (usage.id === sessionId) {
      updated = true;
      return { ...usage, condoName };
    }
    return usage;
  });

  if (updated) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to update token usage", error);
    }
  }
}

export function groupTokenUsage(history: TokenUsage[]): Record<string, TokenUsage> {
  return history.reduce((acc, current) => {
    if (!acc[current.id]) {
      acc[current.id] = {
        id: current.id,
        timestamp: current.timestamp
      };
    }

    if (current.transcriptionUsage) {
      acc[current.id].transcriptionUsage = current.transcriptionUsage;
    }
    if (current.generationUsage) {
      acc[current.id].generationUsage = current.generationUsage;
    }

    if (current.condoName) {
      acc[current.id].condoName = current.condoName;
    }

    if (current.minuteId) {
      acc[current.id].minuteId = current.minuteId;
    }

    // Keep the earliest timestamp for the session
    if (new Date(current.timestamp) < new Date(acc[current.id].timestamp)) {
      acc[current.id].timestamp = current.timestamp;
    }

    return acc;
  }, {} as Record<string, TokenUsage>);
}
